import { DEFAULT_MAP_TYPE } from "../mvp/exclusions";
import { createGoogleMapAdapter } from "./GoogleMapAdapter";
import { createImageMapAdapter } from "./ImageMapAdapter";
import type { MapAdapter, MapCreateOptions } from "./types";

/** Google이 기본. 키·로드 실패 시 업로드 이미지가 정식 대안. */
export function createMapAdapter(options: MapCreateOptions): MapAdapter {
  const key = options.googleKey ?? import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (options.provider !== "image" && key) {
    return createGoogleMapAdapter({
      key,
      center: options.center,
      zoom: options.zoom,
      heading: options.heading,
      mapType: options.mapType ?? DEFAULT_MAP_TYPE,
      interactive: options.interactive ?? false,
    });
  }
  return createImageMapAdapter(options.imageUrl ?? "");
}
