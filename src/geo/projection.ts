import type { LockedMapState, NormalizedPoint } from "../types/eventProject";

const TILE = 256;

export type GeoPoint = { lat: number; lng: number };

export function latLngToWorld(lat: number, lng: number): { x: number; y: number } {
  const clampedLat = Math.max(-85.05112878, Math.min(85.05112878, lat));
  const siny = Math.sin((clampedLat * Math.PI) / 180);
  return {
    x: (lng + 180) / 360,
    y: 0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI),
  };
}

export function worldToLatLng(x: number, y: number): GeoPoint {
  const lng = x * 360 - 180;
  const n = Math.PI - 2 * Math.PI * y;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

export function canProjectMap(map: LockedMapState | undefined): map is LockedMapState & {
  center: { lat: number; lng: number };
  zoom: number;
} {
  return Boolean(map && map.provider === "google" && map.center && typeof map.zoom === "number");
}

export function createMapProjection(map: {
  center: { lat: number; lng: number };
  zoom: number;
  heading?: number;
  baseViewport: { width: number; height: number };
}) {
  const scale = TILE * 2 ** map.zoom;
  const centerWorld = latLngToWorld(map.center.lat, map.center.lng);
  const cx = centerWorld.x * scale;
  const cy = centerWorld.y * scale;
  const heading = ((map.heading ?? 0) * Math.PI) / 180;
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  const width = map.baseViewport.width || 1;
  const height = map.baseViewport.height || 1;

  function latLngToNormalized(lat: number, lng: number): NormalizedPoint {
    const world = latLngToWorld(lat, lng);
    const dx = world.x * scale - cx;
    const dy = world.y * scale - cy;
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    return { x: 0.5 + rx / width, y: 0.5 + ry / height };
  }

  function normalizedToLatLng(point: NormalizedPoint): GeoPoint {
    const rx = (point.x - 0.5) * width;
    const ry = (point.y - 0.5) * height;
    const dx = rx * cos + ry * sin;
    const dy = -rx * sin + ry * cos;
    return worldToLatLng((cx + dx) / scale, (cy + dy) / scale);
  }

  return { latLngToNormalized, normalizedToLatLng };
}

export function polygonToGeo(polygon: NormalizedPoint[], map: Parameters<typeof createMapProjection>[0]): GeoPoint[] {
  const { normalizedToLatLng } = createMapProjection(map);
  return polygon.map((point) => normalizedToLatLng(point));
}

export function geoToNormalized(points: GeoPoint[], map: Parameters<typeof createMapProjection>[0]): NormalizedPoint[] {
  const { latLngToNormalized } = createMapProjection(map);
  return points.map((point) => latLngToNormalized(point.lat, point.lng));
}

export function geoBbox(points: GeoPoint[]): { south: number; west: number; north: number; east: number } | null {
  if (!points.length) {
    return null;
  }
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);
  return {
    south: Math.min(...lats),
    west: Math.min(...lngs),
    north: Math.max(...lats),
    east: Math.max(...lngs),
  };
}

export function padBbox(
  bbox: { south: number; west: number; north: number; east: number },
  pad = 0.00015,
): { south: number; west: number; north: number; east: number } {
  return {
    south: bbox.south - pad,
    west: bbox.west - pad,
    north: bbox.north + pad,
    east: bbox.east + pad,
  };
}
