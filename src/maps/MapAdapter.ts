import type { GeoPoint, MapKind, MapOverlay, MapViewport, PlaceHit, RectBounds } from "./types";

export interface OverlaySyncOptions {
  draggable: boolean;
}

export interface MapAdapter {
  mount(el: HTMLElement, viewport: MapViewport): Promise<void>;
  destroy(): void;
  getViewport(): MapViewport;
  getBounds(): RectBounds;
  setInteractive(enabled: boolean): void;
  setMapType(type: MapKind): void;
  searchPlaces(query: string): Promise<PlaceHit[]>;
  moveTo(lat: number, lng: number): void;
  onMapClick(handler: ((point: GeoPoint) => void) | null): void;
  onMapMouseMove(handler: ((point: GeoPoint) => void) | null): void;
  onMarkerDragEnd(handler: ((id: string, point: GeoPoint) => void) | null): void;
  syncOverlays(overlays: MapOverlay[], options: OverlaySyncOptions): void;
  setDraftRect(bounds: RectBounds | null): void;
}
