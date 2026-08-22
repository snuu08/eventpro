import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { createMapAdapter } from "./createMapAdapter";
import type { MapAdapter } from "./MapAdapter";
import type { GeoPoint, MapKind, MapOverlay, MapViewport, RectBounds } from "./types";
import "./EventMap.css";

interface EventMapProps {
  viewport: MapViewport;
  interactive: boolean;
  mapType: MapKind;
  adapterRef: RefObject<MapAdapter | null>;
  overlays?: MapOverlay[];
  overlayDraggable?: boolean;
  overlayRevision?: number;
  draftRect?: RectBounds | null;
  onReady?: () => void;
  onError?: (message: string) => void;
  onMapClick?: (point: GeoPoint) => void;
  onMapMouseMove?: (point: GeoPoint) => void;
  onMarkerDragEnd?: (id: string, point: GeoPoint) => void;
}

export function EventMap({
  viewport,
  interactive,
  mapType,
  adapterRef,
  overlays = [],
  overlayDraggable = false,
  overlayRevision = 0,
  draftRect = null,
  onReady,
  onError,
  onMapClick,
  onMapMouseMove,
  onMarkerDragEnd,
}: EventMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const initialViewport = useRef(viewport);
  const interactiveRef = useRef(interactive);
  const mapTypeRef = useRef(mapType);
  const onReadyRef = useRef(onReady);
  const onErrorRef = useRef(onError);
  const onMapClickRef = useRef(onMapClick);
  const onMapMouseMoveRef = useRef(onMapMouseMove);
  const onMarkerDragEndRef = useRef(onMarkerDragEnd);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    interactiveRef.current = interactive;
    mapTypeRef.current = mapType;
    onReadyRef.current = onReady;
    onErrorRef.current = onError;
    onMapClickRef.current = onMapClick;
    onMapMouseMoveRef.current = onMapMouseMove;
    onMarkerDragEndRef.current = onMarkerDragEnd;
  });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    const adapter = createMapAdapter();
    adapterRef.current = adapter;
    let cancelled = false;

    adapter
      .mount(el, initialViewport.current)
      .then(() => {
        if (cancelled) {
          adapter.destroy();
          return;
        }
        adapter.setMapType(mapTypeRef.current);
        adapter.setInteractive(interactiveRef.current);
        adapter.onMapClick((point) => onMapClickRef.current?.(point));
        adapter.onMapMouseMove((point) => onMapMouseMoveRef.current?.(point));
        adapter.onMarkerDragEnd((id, point) => onMarkerDragEndRef.current?.(id, point));
        setReady(true);
        onReadyRef.current?.();
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        const message =
          error instanceof Error && error.message === "MISSING_KAKAO_KEY"
            ? "Kakao Maps JavaScript 키가 없습니다. .env 파일에 VITE_KAKAO_MAP_APP_KEY를 설정하세요."
            : "지도를 불러오지 못했습니다. 잠시 후 다시 시도하세요.";
        onErrorRef.current?.(message);
      });

    return () => {
      cancelled = true;
      setReady(false);
      adapter.destroy();
      adapterRef.current = null;
    };
  }, [adapterRef]);

  useEffect(() => {
    adapterRef.current?.setInteractive(interactive);
  }, [adapterRef, interactive]);

  useEffect(() => {
    adapterRef.current?.setMapType(mapType);
  }, [adapterRef, mapType]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    adapterRef.current?.syncOverlays(overlays, { draggable: overlayDraggable });
  }, [adapterRef, overlays, overlayDraggable, overlayRevision, ready]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    adapterRef.current?.setDraftRect(draftRect);
  }, [adapterRef, draftRect, ready]);

  return (
    <div
      ref={containerRef}
      className="event-map"
      role="application"
      aria-label="행사장 지도"
    />
  );
}
