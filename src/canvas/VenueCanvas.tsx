import { Layer, Line, Rect, Stage } from "react-konva";
import { canvasPixelRatio, toScreen, type FrameRect } from "../coords";
import type { NormalizedPoint } from "../types/eventProject";

type Props = {
  width: number;
  height: number;
  polygon: NormalizedPoint[];
};

export function VenueCanvas({ width, height, polygon }: Props) {
  const frame: FrameRect = { x: 0, y: 0, width, height };
  const points = polygon.flatMap((point) => {
    const screen = toScreen(point, frame);
    return [screen.x, screen.y];
  });
  return (
    <Stage width={width} height={height} pixelRatio={canvasPixelRatio()}>
      <Layer>
        <Rect width={width} height={height} fill="#e5e7eb" />
        {points.length >= 6 ? <Line points={points} closed fill="#86efac" opacity={0.45} stroke="#166534" /> : null}
      </Layer>
    </Stage>
  );
}
