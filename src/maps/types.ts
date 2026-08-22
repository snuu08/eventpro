export type MapKind = "roadmap" | "skyview";

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface MapViewport {
  center: GeoPoint;
  /** Provider-neutral zoom. Kakao adapter maps this to map level. */
  zoom: number;
  mapType: MapKind;
}

export interface PlaceHit {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export const DEFAULT_VIEWPORT: MapViewport = {
  center: { lat: 37.566826, lng: 126.978656 },
  zoom: 5,
  mapType: "roadmap",
};

export interface RectBounds {
  sw: GeoPoint;
  ne: GeoPoint;
}

export interface OverlayMarker {
  id: string;
  type: "marker";
  position: GeoPoint;
  label: string;
}

export interface OverlayRect {
  id: string;
  type: "rect";
  sw: GeoPoint;
  ne: GeoPoint;
}

export interface OverlayBooth {
  id: string;
  type: "booth";
  position: GeoPoint;
  sw: GeoPoint;
  ne: GeoPoint;
  label: string;
  conflict?: boolean;
  color?: string;
  dimmed?: boolean;
}

export type MapOverlay = OverlayMarker | OverlayRect | OverlayBooth;
