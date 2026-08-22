import type { MapAdapter } from "./MapAdapter";
import { KakaoMapAdapter } from "./KakaoMapAdapter";

export function createMapAdapter(): MapAdapter {
  return new KakaoMapAdapter();
}
