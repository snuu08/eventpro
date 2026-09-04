import type { MapAdapter } from "./types";

let loading: Promise<void> | undefined;

function waitForSize(el: HTMLElement): Promise<void> {
  if (el.clientWidth > 0 && el.clientHeight > 0) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 0 && el.clientHeight > 0) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(el);
  });
}

export function loadGoogleMaps(key: string): Promise<void> {
  if (window.google?.maps) {
    return Promise.resolve();
  }
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`;
      script.async = true;
      script.onerror = () => {
        loading = undefined;
        reject(new Error("google-maps-load-failed"));
      };
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }
  return loading;
}

export function createGoogleMapAdapter(options: {
  key: string;
  center?: { lat: number; lng: number };
  zoom?: number;
  heading?: number;
  mapType?: "roadmap" | "satellite" | "hybrid";
  interactive: boolean;
}): MapAdapter & {
  getView: () => { center: { lat: number; lng: number }; zoom: number; mapType: "roadmap" | "satellite" | "hybrid" };
  panTo: (center: { lat: number; lng: number }, zoom?: number) => void;
  fitBounds: (viewport: { south: number; west: number; north: number; east: number }) => void;
} {
  let host: HTMLElement | undefined;
  let map: google.maps.Map | undefined;
  let resizeObserver: ResizeObserver | undefined;
  return {
    kind: "google",
    async mount(el) {
      host = el;
      await loadGoogleMaps(options.key);
      await waitForSize(el);
      const lockedCenter = options.center ?? { lat: 37.5665, lng: 126.978 };
      const lockedZoom = options.zoom ?? 17;
      map = new google.maps.Map(el, {
        center: lockedCenter,
        zoom: lockedZoom,
        mapTypeId: options.mapType ?? "hybrid",
        disableDefaultUI: !options.interactive,
        mapTypeControl: options.interactive,
        gestureHandling: options.interactive ? "greedy" : "none",
        keyboardShortcuts: options.interactive,
        draggable: options.interactive,
        scrollwheel: options.interactive,
        disableDoubleClickZoom: !options.interactive,
      });
      const applyLockedView = () => {
        if (!map || options.interactive) {
          return;
        }
        map.setCenter(lockedCenter);
        map.setZoom(lockedZoom);
      };
      resizeObserver = new ResizeObserver(() => {
        if (map) {
          google.maps.event.trigger(map, "resize");
          applyLockedView();
        }
      });
      resizeObserver.observe(el);
      applyLockedView();
    },
    panTo(center, zoom) {
      map?.panTo(center);
      if (zoom !== undefined) {
        map?.setZoom(zoom);
      }
    },
    fitBounds(viewport) {
      map?.fitBounds(
        { south: viewport.south, west: viewport.west, north: viewport.north, east: viewport.east },
        40,
      );
    },
    getView() {
      const center = map?.getCenter();
      const type = String(map?.getMapTypeId() ?? options.mapType ?? "hybrid");
      const mapType = type === "satellite" || type === "roadmap" || type === "hybrid" ? type : "hybrid";
      return {
        center: { lat: center?.lat() ?? 37.5665, lng: center?.lng() ?? 126.978 },
        zoom: map?.getZoom() ?? 17,
        mapType,
      };
    },
    destroy() {
      resizeObserver?.disconnect();
      resizeObserver = undefined;
      host?.replaceChildren();
      host = undefined;
      map = undefined;
    },
  };
}
