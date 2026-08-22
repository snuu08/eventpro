import type { GeoPoint, RectBounds } from "../maps/types";

const METERS_PER_DEG_LAT = 111_320;

export function metersPerDegLng(lat: number): number {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

export function offsetPoint(origin: GeoPoint, eastM: number, northM: number): GeoPoint {
  return {
    lat: origin.lat + northM / METERS_PER_DEG_LAT,
    lng: origin.lng + eastM / metersPerDegLng(origin.lat),
  };
}

export function rectFromCenter(center: GeoPoint, widthM: number, heightM: number): RectBounds {
  const halfW = widthM / 2;
  const halfH = heightM / 2;
  return {
    sw: offsetPoint(center, -halfW, -halfH),
    ne: offsetPoint(center, halfW, halfH),
  };
}

export function squareAround(center: GeoPoint, sizeM: number): RectBounds {
  return rectFromCenter(center, sizeM, sizeM);
}

export function shrinkBounds(bounds: RectBounds, padM: number): RectBounds {
  return {
    sw: offsetPoint(bounds.sw, padM, padM),
    ne: offsetPoint(bounds.ne, -padM, -padM),
  };
}

export function boundsWidthM(bounds: RectBounds): number {
  const lat = (bounds.sw.lat + bounds.ne.lat) / 2;
  return Math.abs(bounds.ne.lng - bounds.sw.lng) * metersPerDegLng(lat);
}

export function boundsHeightM(bounds: RectBounds): number {
  return Math.abs(bounds.ne.lat - bounds.sw.lat) * METERS_PER_DEG_LAT;
}

export function rectsOverlap(a: RectBounds, b: RectBounds): boolean {
  return a.sw.lat < b.ne.lat && a.ne.lat > b.sw.lat && a.sw.lng < b.ne.lng && a.ne.lng > b.sw.lng;
}

export function rectInside(outer: RectBounds, inner: RectBounds): boolean {
  return (
    inner.sw.lat >= outer.sw.lat &&
    inner.sw.lng >= outer.sw.lng &&
    inner.ne.lat <= outer.ne.lat &&
    inner.ne.lng <= outer.ne.lng
  );
}

export function distanceM(a: GeoPoint, b: GeoPoint): number {
  const dLat = (a.lat - b.lat) * METERS_PER_DEG_LAT;
  const dLng = (a.lng - b.lng) * metersPerDegLng((a.lat + b.lat) / 2);
  return Math.hypot(dLat, dLng);
}

export function centerOf(bounds: RectBounds): GeoPoint {
  return {
    lat: (bounds.sw.lat + bounds.ne.lat) / 2,
    lng: (bounds.sw.lng + bounds.ne.lng) / 2,
  };
}

export function isUsableBounds(bounds: RectBounds): boolean {
  return bounds.ne.lat > bounds.sw.lat && bounds.ne.lng > bounds.sw.lng;
}
