import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { IMAGE_MAX_BYTES, IMAGE_TYPES } from "../../shared/limits";
import { loadImage, saveImage } from "../../project/db";
import { createGoogleMapAdapter } from "../../maps/GoogleMapAdapter";
import { DEFAULT_MAP_TYPE } from "../../mvp/exclusions";
import { resolvePlace, searchPlaces, type PlaceSuggestion } from "./searchPlaces";
import type { EventProjectRecord } from "../../project/schema";
import type { LockedMapState } from "../../types/eventProject";

export type PlaceSession = {
  locked: boolean;
  googleKey?: string;
  aspect: number;
  setAspect: (value: number) => void;
  query: string;
  setQuery: (value: string) => void;
  suggestions: PlaceSuggestion[];
  setSuggestions: (value: PlaceSuggestion[]) => void;
  message: string;
  imageHint: boolean;
  applyPlace: (item: PlaceSuggestion) => void;
  onFile: (file: File) => void;
  lockGoogle: () => void;
  onRelockRequest: () => void;
  workspaceZoom: number;
  onWorkspaceZoom: (zoom: number) => void;
  heading: number;
  rotateBy: (delta: number) => void;
  setHeading: (heading: number) => void;
};

export type PlaceSessionProps = {
  project: EventProjectRecord;
  workspaceZoom: number;
  onWorkspaceZoom: (zoom: number) => void;
  onLock: (map: LockedMapState) => void;
  onRelockRequest: () => void;
  mapHost: RefObject<HTMLDivElement | null>;
};

export function usePlaceSession({
  project,
  workspaceZoom,
  onWorkspaceZoom,
  onLock,
  onRelockRequest,
  mapHost,
}: PlaceSessionProps): PlaceSession {
  const [aspect, setAspect] = useState(project.map?.frameAspectRatio ?? 16 / 9);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [message, setMessage] = useState("");
  const [imageHint, setImageHint] = useState(false);
  const [heading, setHeadingState] = useState(project.map?.heading ?? 0);
  const headingRef = useRef(heading);
  const adapter = useRef<ReturnType<typeof createGoogleMapAdapter> | null>(null);
  const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const locked = Boolean(project.map);

  useEffect(() => {
    if (!project.map?.uploadedImageId) {
      return;
    }
    void loadImage(project.map.uploadedImageId).then((blob) => {
      if (blob) {
        setImageHint(true);
      }
    });
  }, [project.map?.uploadedImageId]);

  useEffect(() => {
    headingRef.current = heading;
  }, [heading]);

  useEffect(() => {
    const el = mapHost.current;
    if (!el || !googleKey || project.map?.provider === "image") {
      return;
    }
    const instance = createGoogleMapAdapter({
      key: googleKey,
      center: project.map?.center,
      zoom: project.map?.zoom,
      heading: project.map?.heading,
      mapType: project.map?.mapType ?? DEFAULT_MAP_TYPE,
      interactive: !locked,
    });
    adapter.current = instance;
    void instance.mount(el);
    return () => {
      instance.destroy();
      adapter.current = null;
    };
  }, [googleKey, locked, mapHost, project.map]);

  useEffect(() => {
    const el = mapHost.current?.parentElement;
    if (!el || !googleKey || locked) {
      return;
    }
    const target = el;
    let dragging = false;
    let originX = 0;
    let originHeading = 0;

    function start(event: PointerEvent) {
      if (event.button !== 2 && !event.shiftKey) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      dragging = true;
      originX = event.clientX;
      originHeading = headingRef.current;
      target.setPointerCapture(event.pointerId);
    }

    function move(event: PointerEvent) {
      if (!dragging) {
        return;
      }
      event.preventDefault();
      const next = (originHeading - (event.clientX - originX) * 0.45 + 360) % 360;
      setHeadingState(next);
    }

    function end(event: PointerEvent) {
      if (!dragging) {
        return;
      }
      dragging = false;
      if (target.hasPointerCapture(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
    }

    function onContext(event: Event) {
      event.preventDefault();
    }

    el.addEventListener("pointerdown", start, true);
    el.addEventListener("pointermove", move, true);
    el.addEventListener("pointerup", end, true);
    el.addEventListener("pointercancel", end, true);
    el.addEventListener("contextmenu", onContext, true);
    return () => {
      el.removeEventListener("pointerdown", start, true);
      el.removeEventListener("pointermove", move, true);
      el.removeEventListener("pointerup", end, true);
      el.removeEventListener("pointercancel", end, true);
      el.removeEventListener("contextmenu", onContext, true);
    };
  }, [googleKey, locked, mapHost]);

  useEffect(() => {
    if (!googleKey || locked) {
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 1) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void searchPlaces(trimmed, controller.signal)
        .then((next) => {
          setSuggestions(next);
          setMessage(next.length ? "" : "장소를 찾지 못했습니다.");
        })
        .catch(() => {
          if (controller.signal.aborted) {
            return;
          }
          setSuggestions([]);
          setMessage("장소 검색에 실패했습니다.");
        });
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [googleKey, locked, query]);

  function applyPlace(item: PlaceSuggestion) {
    if (!googleKey || locked) {
      return;
    }
    setQuery(item.name);
    setSuggestions([]);
    void resolvePlace(item.placeId)
      .then((hit) => {
        if (hit.viewport) {
          adapter.current?.fitBounds(hit.viewport);
        } else {
          adapter.current?.panTo({ lat: hit.lat, lng: hit.lng }, 19);
        }
        setMessage("");
      })
      .catch(() => {
        setMessage("장소를 찾지 못했습니다.");
      });
  }

  async function onFile(file: File) {
    if (!IMAGE_TYPES.includes(file.type)) {
      setMessage("JPEG, PNG, WebP만 올릴 수 있습니다.");
      return;
    }
    if (file.size > IMAGE_MAX_BYTES) {
      setMessage("이미지가 8MB를 넘습니다.");
      return;
    }
    const id = crypto.randomUUID();
    await saveImage(id, file);
    setImageHint(true);
    onLock({
      provider: "image",
      mapType: "hybrid",
      frameAspectRatio: aspect,
      baseViewport: { width: 1280, height: Math.round(1280 / aspect) },
      lockedAt: new Date().toISOString(),
      uploadedImageId: id,
    });
  }

  function setHeading(next: number) {
    if (locked) {
      return;
    }
    const wrapped = ((next % 360) + 360) % 360;
    setHeadingState(wrapped);
  }

  function rotateBy(delta: number) {
    setHeading((heading + delta + 360) % 360);
  }

  function lockGoogle() {
    const view = adapter.current?.getView();
    if (!view) {
      setMessage("지도를 아직 불러오지 못했습니다.");
      return;
    }
    onLock({
      provider: "google",
      center: view.center,
      zoom: view.zoom,
      heading,
      mapType: view.mapType,
      frameAspectRatio: aspect,
      baseViewport: { width: 1280, height: Math.round(1280 / aspect) },
      lockedAt: new Date().toISOString(),
    });
  }

  return {
    locked,
    googleKey,
    aspect,
    setAspect,
    query,
    setQuery,
    suggestions,
    setSuggestions,
    message,
    imageHint,
    applyPlace,
    onFile,
    lockGoogle,
    onRelockRequest,
    workspaceZoom,
    onWorkspaceZoom,
    heading,
    rotateBy,
    setHeading,
  };
}

export function PlaceSessionHost({
  children,
  ...props
}: PlaceSessionProps & { children: (session: PlaceSession) => ReactNode }) {
  const session = usePlaceSession(props);
  return children(session);
}
