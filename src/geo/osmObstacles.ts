import type { LockedMapState, NormalizedPoint, VenueObstacle } from "../types/eventProject";
import { canProjectMap, createMapProjection, geoBbox, padBbox, polygonToGeo, type GeoPoint } from "./projection";
import { OSM_ATTRIBUTION } from "./osmQuery";
import { pointInPolygon } from "../layout/polygon";

export { OSM_ATTRIBUTION };

export type OsmFetchStatus = "idle" | "loading" | "ready" | "empty" | "skipped" | "error";

type ApiObstacle = {
  osmId: string;
  type: VenueObstacle["type"];
  geometry: GeoPoint[];
};

type ApiResponse = {
  obstacles?: ApiObstacle[];
  error?: string;
};

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function shouldFetchOsmObstacles(map: LockedMapState | undefined, polygon: NormalizedPoint[]): boolean {
  return canProjectMap(map) && polygon.length >= 3;
}

export function mergeObstacleConfirmation(
  next: VenueObstacle[],
  previous: VenueObstacle[] | undefined,
): VenueObstacle[] {
  const hidden = new Set((previous ?? []).filter((item) => !item.confirmed).map((item) => item.osmId));
  return next.map((item) => (hidden.has(item.osmId) ? { ...item, confirmed: false } : item));
}

export async function fetchVenueOsmObstacles(
  map: LockedMapState,
  polygon: NormalizedPoint[],
  signal?: AbortSignal,
): Promise<VenueObstacle[]> {
  if (!canProjectMap(map)) {
    return [];
  }
  const geoPoly = polygonToGeo(polygon, map);
  const bbox = geoBbox(geoPoly);
  if (!bbox) {
    return [];
  }
  const padded = padBbox(bbox);
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), 15_000);
  if (signal) {
    if (signal.aborted) {
      controller.abort();
    } else {
      signal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }
  try {
    const response = await fetch("/api/venue/osm-obstacles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...padded, polygon: geoPoly }),
      signal: controller.signal,
    });
    if (response.status === 429) {
      throw new Error("osm-rate-limited");
    }
    if (!response.ok) {
      throw new Error("osm-fetch-failed");
    }
    const payload = (await response.json()) as ApiResponse;
    if (payload.error && !payload.obstacles) {
      throw new Error(payload.error);
    }
    const { latLngToNormalized } = createMapProjection(map);
    const items: VenueObstacle[] = [];
    for (const raw of payload.obstacles ?? []) {
      const normalizedGeometry = raw.geometry.map((point) => {
        const n = latLngToNormalized(point.lat, point.lng);
        return { x: clamp01(n.x), y: clamp01(n.y) };
      });
      const inside =
        normalizedGeometry.some((point) => pointInPolygon(point, polygon)) ||
        (normalizedGeometry.length >= 3 && polygon.some((point) => pointInPolygon(point, normalizedGeometry)));
      if (!inside) {
        continue;
      }
      items.push({
        id: `osm-${raw.osmId}`,
        source: "osm",
        type: raw.type,
        osmId: raw.osmId,
        geoGeometry: raw.geometry,
        normalizedGeometry,
        confirmed: true,
      });
    }
    return items;
  } finally {
    globalThis.clearTimeout(timer);
  }
}
