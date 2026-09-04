import type { FrameRect } from "../coords";

export function letterbox(container: { width: number; height: number }, aspect: number): FrameRect {
  if (container.width <= 0 || container.height <= 0 || aspect <= 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const containerAspect = container.width / container.height;
  if (containerAspect > aspect) {
    const height = container.height;
    const width = height * aspect;
    return { x: (container.width - width) / 2, y: 0, width, height };
  }
  const width = container.width;
  const height = width / aspect;
  return { x: 0, y: (container.height - height) / 2, width, height };
}

/** 고정 창을 어떤 각도로 돌려도 가득 채우는 정사각형 한 변. */
export function coverSquareSide(width: number, height: number): number {
  if (width <= 0 || height <= 0) {
    return 0;
  }
  return Math.hypot(width, height);
}
