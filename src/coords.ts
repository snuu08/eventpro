import type { NormalizedPoint } from "./types/eventProject";

export type FrameRect = { x: number; y: number; width: number; height: number };

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function normalizePoint(point: NormalizedPoint): NormalizedPoint {
  return { x: clamp01(point.x), y: clamp01(point.y) };
}

/** 잠긴 프레임 안의 화면 좌표 → 저장용 0~1. 창 크기와 무관한 데이터. */
export function toNormalized(screen: { x: number; y: number }, frame: FrameRect): NormalizedPoint {
  if (frame.width === 0 || frame.height === 0) {
    return { x: 0, y: 0 };
  }
  return normalizePoint({
    x: (screen.x - frame.x) / frame.width,
    y: (screen.y - frame.y) / frame.height,
  });
}

/** 저장 좌표 → 현재 프레임의 화면 좌표. 리사이즈 때마다 다시 계산한다. */
export function toScreen(point: NormalizedPoint, frame: FrameRect): { x: number; y: number } {
  return {
    x: frame.x + point.x * frame.width,
    y: frame.y + point.y * frame.height,
  };
}

export function canvasPixelRatio(dpr = globalThis.devicePixelRatio): number {
  return Math.max(1, dpr || 1);
}
