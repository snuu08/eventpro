import { useEffect, useRef, type ReactNode } from "react";
import { coverSquareSide, letterbox } from "../../shared/letterbox";
import type { FrameRect } from "../../coords";

type Props = {
  aspect: number;
  baseWidth: number;
  baseHeight: number;
  workspaceZoom: number;
  heading?: number;
  mapLayer?: ReactNode;
  children: (frame: FrameRect) => ReactNode;
};

export function FrameStage({ aspect, baseWidth, baseHeight, workspaceZoom, heading = 0, mapLayer, children }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const box = useRef<FrameRect>({ x: 0, y: 0, width: baseWidth, height: baseHeight });

  useEffect(() => {
    const node = host.current;
    if (!node) {
      return;
    }
    const apply = () => {
      const fitted = letterbox({ width: node.clientWidth, height: node.clientHeight }, aspect);
      box.current = fitted;
      const inner = node.querySelector("[data-frame-inner]") as HTMLElement | null;
      if (inner) {
        inner.style.left = `${fitted.x}px`;
        inner.style.top = `${fitted.y}px`;
        inner.style.width = `${fitted.width}px`;
        inner.style.height = `${fitted.height}px`;
        inner.style.transform = `scale(${workspaceZoom})`;
        inner.style.transformOrigin = "center center";
      }
      const cover = coverSquareSide(fitted.width, fitted.height);
      const rotator = node.querySelector("[data-frame-rotator]") as HTMLElement | null;
      if (rotator) {
        rotator.style.left = `${(fitted.width - cover) / 2}px`;
        rotator.style.top = `${(fitted.height - cover) / 2}px`;
        rotator.style.width = `${cover}px`;
        rotator.style.height = `${cover}px`;
        rotator.style.transform = `rotate(${heading}deg)`;
      }
      const world = node.querySelector("[data-frame-world]") as HTMLElement | null;
      if (world) {
        const scale = fitted.width / baseWidth;
        world.style.width = `${baseWidth}px`;
        world.style.height = `${baseHeight}px`;
        world.style.transform = `scale(${scale})`;
      }
    };
    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, [aspect, baseWidth, baseHeight, workspaceZoom, heading]);

  return (
    <div ref={host} className="relative h-full min-h-[320px] w-full overflow-hidden bg-gray-800">
      <div data-frame-inner className="absolute overflow-hidden bg-gray-200" data-testid="locked-frame">
        <div data-frame-rotator className="absolute origin-center">
          <div className="absolute inset-0">{mapLayer}</div>
        </div>
        <div data-frame-world className="pointer-events-none absolute inset-0 origin-top-left">
          {children({ x: 0, y: 0, width: baseWidth, height: baseHeight })}
        </div>
      </div>
    </div>
  );
}
