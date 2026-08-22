import type { MapAdapter, OverlaySyncOptions } from "./MapAdapter";
import type { GeoPoint, MapKind, MapOverlay, MapViewport, PlaceHit, RectBounds } from "./types";
import { getKakaoAppKey, loadKakaoSdk } from "./kakaoSdk";

interface MarkerOverlay {
  marker: kakao.maps.Marker;
  label: kakao.maps.CustomOverlay;
}

interface BoothOverlay {
  marker: kakao.maps.Marker;
  label: kakao.maps.CustomOverlay;
  rect: kakao.maps.Rectangle;
  halfLat: number;
  halfLng: number;
}

function toLatLng(point: GeoPoint): kakao.maps.LatLng {
  return new kakao.maps.LatLng(point.lat, point.lng);
}

function toBounds(bounds: RectBounds): kakao.maps.LatLngBounds {
  return new kakao.maps.LatLngBounds(toLatLng(bounds.sw), toLatLng(bounds.ne));
}

function pointFromLatLng(latLng: kakao.maps.LatLng): GeoPoint {
  return { lat: latLng.getLat(), lng: latLng.getLng() };
}

function createLabelContent(label: string): HTMLDivElement {
  const el = document.createElement("div");
  el.className = "overlay-label";
  el.textContent = label;
  return el;
}

export class KakaoMapAdapter implements MapAdapter {
  private map: kakao.maps.Map | null = null;
  private container: HTMLElement | null = null;
  private zoomControl: kakao.maps.ZoomControl | null = null;
  private zoomControlAdded = false;
  private searchMarker: kakao.maps.Marker | null = null;
  private mapType: MapKind = "roadmap";
  private clickHandler: ((point: GeoPoint) => void) | null = null;
  private moveHandler: ((point: GeoPoint) => void) | null = null;
  private dragHandler: ((id: string, point: GeoPoint) => void) | null = null;
  private clickListener: ((event: kakao.maps.event.MouseEvent) => void) | null = null;
  private moveListener: ((event: kakao.maps.event.MouseEvent) => void) | null = null;
  private markers = new Map<string, MarkerOverlay>();
  private booths = new Map<string, BoothOverlay>();
  private rects = new Map<string, kakao.maps.Rectangle>();
  private draftRect: kakao.maps.Rectangle | null = null;

  async mount(el: HTMLElement, viewport: MapViewport): Promise<void> {
    const appKey = getKakaoAppKey();
    if (!appKey) {
      throw new Error("MISSING_KAKAO_KEY");
    }

    await loadKakaoSdk(appKey);

    this.container = el;
    this.mapType = viewport.mapType;

    const center = toLatLng(viewport.center);
    this.map = new kakao.maps.Map(el, {
      center,
      level: this.toKakaoLevel(viewport.zoom),
    });
    this.zoomControl = new kakao.maps.ZoomControl();
    this.setMapType(viewport.mapType);
    this.bindMapListeners();
  }

  destroy(): void {
    this.clearSearchMarker();
    this.clearOverlays();
    this.setDraftRect(null);
    this.unbindMapListeners();
    this.zoomControl = null;
    this.zoomControlAdded = false;
    this.map = null;
    if (this.container) {
      this.container.replaceChildren();
      this.container = null;
    }
  }

  getViewport(): MapViewport {
    if (!this.map) {
      throw new Error("Map is not mounted");
    }

    const center = this.map.getCenter();
    return {
      center: pointFromLatLng(center),
      zoom: this.fromKakaoLevel(this.map.getLevel()),
      mapType: this.mapType,
    };
  }

  getBounds(): RectBounds {
    if (!this.map) {
      throw new Error("Map is not mounted");
    }
    const bounds = this.map.getBounds();
    return {
      sw: pointFromLatLng(bounds.getSouthWest()),
      ne: pointFromLatLng(bounds.getNorthEast()),
    };
  }

  setInteractive(enabled: boolean): void {
    if (!this.map || !this.zoomControl) {
      return;
    }

    this.map.setDraggable(enabled);
    this.map.setZoomable(enabled);

    if (enabled && !this.zoomControlAdded) {
      this.map.addControl(this.zoomControl, kakao.maps.ControlPosition.RIGHT);
      this.zoomControlAdded = true;
    } else if (!enabled && this.zoomControlAdded) {
      this.map.removeControl(this.zoomControl);
      this.zoomControlAdded = false;
    }
  }

  setMapType(type: MapKind): void {
    if (!this.map) {
      return;
    }

    this.mapType = type;
    const typeId =
      type === "skyview"
        ? kakao.maps.MapTypeId.HYBRID
        : kakao.maps.MapTypeId.ROADMAP;
    this.map.setMapTypeId(typeId);
  }

  searchPlaces(query: string): Promise<PlaceHit[]> {
    if (!this.map) {
      return Promise.reject(new Error("Map is not mounted"));
    }

    const trimmed = query.trim();
    if (!trimmed) {
      return Promise.resolve([]);
    }

    const places = new kakao.maps.services.Places(this.map);

    return new Promise((resolve, reject) => {
      places.keywordSearch(trimmed, (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
          resolve(
            data.map((item) => ({
              id: item.id,
              name: item.place_name,
              address: item.road_address_name || item.address_name,
              lat: Number(item.y),
              lng: Number(item.x),
            })),
          );
          return;
        }

        if (status === kakao.maps.services.Status.ZERO_RESULT) {
          resolve([]);
          return;
        }

        reject(new Error("Place search failed"));
      });
    });
  }

  moveTo(lat: number, lng: number): void {
    if (!this.map) {
      return;
    }

    const position = new kakao.maps.LatLng(lat, lng);
    this.map.setCenter(position);
    this.clearSearchMarker();
    this.searchMarker = new kakao.maps.Marker({
      position,
      map: this.map,
    });
  }

  onMapClick(handler: ((point: GeoPoint) => void) | null): void {
    this.clickHandler = handler;
  }

  onMapMouseMove(handler: ((point: GeoPoint) => void) | null): void {
    this.moveHandler = handler;
  }

  onMarkerDragEnd(handler: ((id: string, point: GeoPoint) => void) | null): void {
    this.dragHandler = handler;
  }

  syncOverlays(overlays: MapOverlay[], options: OverlaySyncOptions): void {
    if (!this.map) {
      return;
    }

    this.clearOverlays();

    for (const overlay of overlays) {
      if (overlay.type === "marker") {
        this.addMarker(overlay.id, overlay.position, overlay.label, options.draggable);
      } else if (overlay.type === "booth") {
        this.addBooth(overlay, options.draggable);
      } else {
        this.rects.set(overlay.id, this.createRectangle(overlay, "#9b2226", 0.22));
      }
    }
  }

  setDraftRect(bounds: RectBounds | null): void {
    this.draftRect?.setMap(null);
    this.draftRect = null;
    if (!bounds || !this.map) {
      return;
    }
    this.draftRect = this.createRectangle(bounds, "#9b2226", 0.12, true);
  }

  private bindMapListeners(): void {
    if (!this.map) {
      return;
    }

    this.clickListener = (event) => {
      this.clickHandler?.(pointFromLatLng(event.latLng));
    };
    this.moveListener = (event) => {
      this.moveHandler?.(pointFromLatLng(event.latLng));
    };

    kakao.maps.event.addListener(this.map, "click", this.clickListener);
    kakao.maps.event.addListener(this.map, "mousemove", this.moveListener);
  }

  private unbindMapListeners(): void {
    if (this.map && this.clickListener) {
      kakao.maps.event.removeListener(this.map, "click", this.clickListener);
    }
    if (this.map && this.moveListener) {
      kakao.maps.event.removeListener(this.map, "mousemove", this.moveListener);
    }
    this.clickListener = null;
    this.moveListener = null;
    this.clickHandler = null;
    this.moveHandler = null;
    this.dragHandler = null;
  }

  private addMarker(id: string, position: GeoPoint, label: string, draggable: boolean): void {
    if (!this.map) {
      return;
    }

    const latLng = toLatLng(position);
    const marker = new kakao.maps.Marker({
      position: latLng,
      map: this.map,
      draggable,
      title: label,
      zIndex: 4,
    });
    const overlay = new kakao.maps.CustomOverlay({
      position: latLng,
      content: createLabelContent(label),
      yAnchor: 2.15,
      xAnchor: 0.5,
      zIndex: 5,
    });
    overlay.setMap(this.map);

    kakao.maps.event.addListener(marker, "drag", () => {
      overlay.setPosition(marker.getPosition());
    });
    kakao.maps.event.addListener(marker, "dragend", () => {
      const next = pointFromLatLng(marker.getPosition());
      overlay.setPosition(marker.getPosition());
      this.dragHandler?.(id, next);
    });

    this.markers.set(id, { marker, label: overlay });
  }

  private addBooth(
    overlay: Extract<MapOverlay, { type: "booth" }>,
    draggable: boolean,
  ): void {
    if (!this.map) {
      return;
    }

    const dimmed = overlay.dimmed === true && !overlay.conflict;
    const color = overlay.conflict ? "#9b2226" : overlay.color ?? "#2d6a4f";
    const rect = this.createRectangle(
      { sw: overlay.sw, ne: overlay.ne },
      color,
      dimmed ? 0.08 : 0.3,
      false,
      dimmed ? 0.28 : 0.9,
    );
    const latLng = toLatLng(overlay.position);
    const marker = new kakao.maps.Marker({
      position: latLng,
      map: this.map,
      draggable,
      title: overlay.label,
      zIndex: dimmed ? 3 : 8,
    });
    const labelEl = createLabelContent(overlay.label);
    labelEl.classList.add("booth-label");
    if (overlay.conflict) {
      labelEl.classList.add("is-conflict");
    } else if (dimmed) {
      labelEl.classList.add("is-dimmed");
    }
    const label = new kakao.maps.CustomOverlay({
      position: latLng,
      content: labelEl,
      yAnchor: 0.5,
      xAnchor: 0.5,
      zIndex: 7,
    });
    label.setMap(this.map);

    const halfLat = (overlay.ne.lat - overlay.sw.lat) / 2;
    const halfLng = (overlay.ne.lng - overlay.sw.lng) / 2;

    const moveFootprint = () => {
      const center = marker.getPosition();
      label.setPosition(center);
      rect.setBounds(
        new kakao.maps.LatLngBounds(
          new kakao.maps.LatLng(center.getLat() - halfLat, center.getLng() - halfLng),
          new kakao.maps.LatLng(center.getLat() + halfLat, center.getLng() + halfLng),
        ),
      );
    };

    kakao.maps.event.addListener(marker, "drag", moveFootprint);
    kakao.maps.event.addListener(marker, "dragend", () => {
      moveFootprint();
      this.dragHandler?.(overlay.id, pointFromLatLng(marker.getPosition()));
    });

    this.booths.set(overlay.id, { marker, label, rect, halfLat, halfLng });
  }

  private createRectangle(
    bounds: RectBounds,
    color: string,
    fillOpacity: number,
    dashed = false,
    strokeOpacity = 0.85,
  ): kakao.maps.Rectangle {
    const rectangle = new kakao.maps.Rectangle({
      bounds: toBounds(bounds),
      strokeWeight: 2,
      strokeColor: color,
      strokeOpacity,
      strokeStyle: dashed ? "dashed" : "solid",
      fillColor: color,
      fillOpacity,
    });
    rectangle.setMap(this.map);
    return rectangle;
  }

  private clearOverlays(): void {
    for (const item of this.markers.values()) {
      item.marker.setMap(null);
      item.label.setMap(null);
    }
    this.markers.clear();

    for (const item of this.booths.values()) {
      item.marker.setMap(null);
      item.label.setMap(null);
      item.rect.setMap(null);
    }
    this.booths.clear();

    for (const rect of this.rects.values()) {
      rect.setMap(null);
    }
    this.rects.clear();
  }

  private clearSearchMarker(): void {
    this.searchMarker?.setMap(null);
    this.searchMarker = null;
  }

  private toKakaoLevel(zoom: number): number {
    return Math.min(14, Math.max(1, Math.round(zoom)));
  }

  private fromKakaoLevel(level: number): number {
    return level;
  }
}
