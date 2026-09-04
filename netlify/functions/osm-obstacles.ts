import type { Config } from "@netlify/functions";
import { buildOsmObstacleQuery } from "../../src/geo/osmQuery";

const MAX_SPAN = 0.05;
const MAX_ELEMENTS = 220;
const OVERPASS = "https://overpass-api.de/api/interpreter";

type GeoPoint = { lat: number; lng: number };

type ObstacleType = "building" | "barrier" | "tree" | "water" | "construction" | "fountain";

type OverpassElement = {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: Array<{ lat: number; lon: number }>;
  members?: Array<{ type: string; ref: number; role?: string; geometry?: Array<{ lat: number; lon: number }> }>;
};

function json(body: unknown, status = 200, extra?: HeadersInit): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "public, max-age=60",
      ...extra,
    },
  });
}

function pointInRing(point: GeoPoint, ring: GeoPoint[]): boolean {
  if (ring.length < 3) {
    return false;
  }
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i];
    const b = ring[j];
    const crosses = a.lat > point.lat !== b.lat > point.lat;
    if (crosses && point.lng < ((b.lng - a.lng) * (point.lat - a.lat)) / (b.lat - a.lat) + a.lng) {
      inside = !inside;
    }
  }
  return inside;
}

function classify(tags: Record<string, string> | undefined): ObstacleType | null {
  if (!tags) {
    return null;
  }
  if (tags.building && tags.building !== "no") {
    return "building";
  }
  if (tags.natural === "tree" || tags.natural === "tree_row") {
    return "tree";
  }
  if (tags.natural === "water" || Boolean(tags.waterway)) {
    return "water";
  }
  if (tags.amenity === "fountain") {
    return "fountain";
  }
  if (tags.landuse === "construction") {
    return "construction";
  }
  if (tags.barrier && tags.barrier !== "no") {
    return "barrier";
  }
  return null;
}

function geometryOf(element: OverpassElement): GeoPoint[] {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return [{ lat: element.lat, lng: element.lon }];
  }
  if (element.geometry?.length) {
    return element.geometry.map((item) => ({ lat: item.lat, lng: item.lon }));
  }
  const fromMembers: GeoPoint[] = [];
  for (const member of element.members ?? []) {
    if (member.role && member.role !== "outer" && member.role !== "") {
      continue;
    }
    for (const item of member.geometry ?? []) {
      fromMembers.push({ lat: item.lat, lng: item.lon });
    }
  }
  return fromMembers;
}

function intersectsVenue(geom: GeoPoint[], venue: GeoPoint[]): boolean {
  if (geom.some((point) => pointInRing(point, venue))) {
    return true;
  }
  if (geom.length >= 3 && venue.some((point) => pointInRing(point, geom))) {
    return true;
  }
  return false;
}

const OSM_WAIT_MS = 22_000;

export default async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let body: {
    south?: number;
    west?: number;
    north?: number;
    east?: number;
    polygon?: GeoPoint[];
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return json({ obstacles: [], error: "요청 형식이 올바르지 않습니다." }, 400);
  }

  const south = Number(body.south);
  const west = Number(body.west);
  const north = Number(body.north);
  const east = Number(body.east);
  const polygon = Array.isArray(body.polygon) ? body.polygon.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)) : [];

  if (![south, west, north, east].every(Number.isFinite) || north <= south || east <= west) {
    return json({ obstacles: [], error: "영역 범위가 올바르지 않습니다." }, 400);
  }
  if (north - south > MAX_SPAN || east - west > MAX_SPAN) {
    return json({ obstacles: [], error: "조회 범위가 너무 큽니다." }, 400);
  }
  if (polygon.length < 3) {
    return json({ obstacles: [], error: "선택 영역 다각형이 필요합니다." }, 400);
  }

  const query = buildOsmObstacleQuery({ south, west, north, east });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OSM_WAIT_MS);
  try {
    const response = await fetch(OVERPASS, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Accept: "application/json",
        "User-Agent": "EventPro/1.0 (layout obstacles; OSM credit)",
      },
      body: new URLSearchParams({ data: query }),
      signal: controller.signal,
    });
    if (response.status === 429) {
      return json({ obstacles: [], error: "OSM 조회가 잠시 제한되었습니다." }, 429);
    }
    if (!response.ok) {
      return json({ obstacles: [], error: "OSM 조회에 실패했습니다." }, 502);
    }
    const payload = (await response.json()) as { elements?: OverpassElement[] };
    const obstacles: Array<{ osmId: string; type: ObstacleType; geometry: GeoPoint[] }> = [];
    for (const element of payload.elements ?? []) {
      const type = classify(element.tags);
      if (!type) {
        continue;
      }
      const geometry = geometryOf(element);
      if (!geometry.length || !intersectsVenue(geometry, polygon)) {
        continue;
      }
      obstacles.push({
        osmId: `${element.type}/${element.id}`,
        type,
        geometry,
      });
      if (obstacles.length >= MAX_ELEMENTS) {
        break;
      }
    }
    return json({
      obstacles,
      attribution: "© OpenStreetMap contributors",
    });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "AbortError";
    return json({ obstacles: [], error: timedOut ? "OSM 조회 시간이 초과되었습니다." : "OSM 조회에 실패했습니다." }, timedOut ? 504 : 502);
  } finally {
    clearTimeout(timer);
  }
};

export const config: Config = {
  path: "/api/venue/osm-obstacles",
  method: "POST",
};
