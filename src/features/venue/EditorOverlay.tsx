import { Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { canvasPixelRatio, clamp01, toScreen, type FrameRect } from "../../coords";
import type { AccessPoint, OptionalFacility, ProgramBooth, VenueObstacle } from "../../types/eventProject";
import type { NormalizedPoint } from "../../types/eventProject";
import type { Agent } from "../../sim/simulate";
import type { HeatCell } from "../../sim/simulate";
import { DEFAULT_BOOTH_SIZE, boothSize } from "../../layout/booth";
import { flowAxis } from "../../layout/autoLayout";

export type EditorTool = "select" | "polygon" | "entrance" | "exit" | "booth";

type Props = {
  frame: FrameRect;
  polygon: NormalizedPoint[];
  accessPoints: AccessPoint[];
  booths: ProgramBooth[];
  facilities: OptionalFacility[];
  agents?: Agent[];
  heat?: HeatCell[];
  showHeat?: boolean;
  tool: EditorTool;
  drawing: boolean;
  selectedId?: string;
  onPolygonPoint: (point: NormalizedPoint) => void;
  onMoveVertex: (index: number, point: NormalizedPoint) => void;
  onPlaceAccess: (point: NormalizedPoint) => void;
  onSelect: (id: string) => void;
  onMoveBooth?: (id: string, point: NormalizedPoint) => void;
  onPlaceBooth?: (point: NormalizedPoint) => void;
  gapPreview?: { kind: "aisle" | "gap"; aisleWidth: number; boothGap: number } | null;
  obstacles?: VenueObstacle[];
};

function pointFromPointer(event: ReactPointerEvent<HTMLDivElement>): NormalizedPoint {
  const bounds = event.currentTarget.getBoundingClientRect();
  const width = bounds.width || 1;
  const height = bounds.height || 1;
  return {
    x: clamp01((event.clientX - bounds.left) / width),
    y: clamp01((event.clientY - bounds.top) / height),
  };
}

export function EditorOverlay({
  frame,
  polygon,
  accessPoints,
  booths,
  facilities,
  agents = [],
  heat = [],
  showHeat = false,
  tool,
  drawing,
  selectedId,
  onPolygonPoint,
  onMoveVertex,
  onPlaceAccess,
  onSelect,
  onMoveBooth,
  onPlaceBooth,
  gapPreview,
  obstacles = [],
}: Props) {
  const dragged = useRef(false);
  const polyPoints = polygon.flatMap((p) => {
    const s = toScreen(p, frame);
    return [s.x, s.y];
  });
  const placing = drawing && (tool === "polygon" || tool === "entrance" || tool === "exit");
  const placingBooth = tool === "booth";

  return (
    <div
      className={`absolute inset-0 z-10 ${placing || placingBooth ? "cursor-crosshair" : ""}`}
      onPointerDown={(event) => {
        if (!placing || event.button !== 0) {
          return;
        }
        event.preventDefault();
        const point = pointFromPointer(event);
        if (tool === "polygon") {
          onPolygonPoint(point);
        }
        if (tool === "entrance" || tool === "exit") {
          onPlaceAccess(point);
        }
      }}
    >
      <Stage width={frame.width} height={frame.height} pixelRatio={canvasPixelRatio()} listening={!placing}>
        <Layer>
          <Rect
            width={frame.width}
            height={frame.height}
            fill="rgba(255,255,255,0.04)"
            listening={placingBooth}
            onClick={(event) => {
              if (!placingBooth) {
                return;
              }
              const pos = event.target.getStage()?.getPointerPosition();
              if (!pos) {
                return;
              }
              onPlaceBooth?.({ x: clamp01(pos.x / frame.width), y: clamp01(pos.y / frame.height) });
            }}
          />
          {showHeat
            ? heat.map((cell, index) => {
                const s = toScreen(cell, frame);
                const size = frame.width / 20;
                return (
                  <Rect
                    key={`h-${index}`}
                    x={s.x - size / 2}
                    y={s.y - size / 2}
                    width={size}
                    height={size}
                    fill={`rgba(185,28,28,${Math.min(0.55, cell.density / 400)})`}
                    listening={false}
                  />
                );
              })
            : null}
          {polyPoints.length >= 6 ? (
            <Line points={polyPoints} closed fill="rgba(22,163,74,0.2)" stroke="#166534" strokeWidth={3} listening={false} />
          ) : null}
          {obstacles
            .filter((item) => item.confirmed)
            .map((item) => {
              const points = item.normalizedGeometry.flatMap((p) => {
                const s = toScreen(p, frame);
                return [s.x, s.y];
              });
              if (item.normalizedGeometry.length >= 3) {
                return (
                  <Line
                    key={item.id}
                    points={points}
                    closed
                    fill="rgba(120,53,15,0.32)"
                    stroke="rgba(69,26,3,0.8)"
                    strokeWidth={1}
                    listening={false}
                  />
                );
              }
              const p = item.normalizedGeometry[0];
              if (!p) {
                return null;
              }
              const s = toScreen(p, frame);
              return (
                <Circle key={item.id} x={s.x} y={s.y} radius={7} fill="rgba(120,53,15,0.55)" listening={false} />
              );
            })}
          {polygon.map((p, index) => {
            const s = toScreen(p, frame);
            return (
              <Circle
                key={`v-${index}`}
                x={s.x}
                y={s.y}
                radius={8}
                fill="#166534"
                draggable={!placing}
                onDragEnd={(evt) =>
                  onMoveVertex(index, { x: clamp01(evt.target.x() / frame.width), y: clamp01(evt.target.y() / frame.height) })
                }
              />
            );
          })}
          {accessPoints.map((item) => {
            const s = toScreen(item.position, frame);
            const entrance = item.roles.includes("entrance");
            const exit = item.roles.includes("exit");
            return (
              <Group key={item.id} x={s.x} y={s.y} onClick={() => onSelect(item.id)}>
                <Circle radius={10} fill={entrance ? "#16a34a" : "#2563eb"} stroke={exit ? "#1d4ed8" : "#14532d"} strokeWidth={2} />
                <Text text={item.label} y={12} fontSize={12} fill="#111" />
              </Group>
            );
          })}
          {facilities.map((item) => {
            const s = toScreen(item.position, frame);
            return <Rect key={item.id} x={s.x - 8} y={s.y - 8} width={16} height={16} fill="#a16207" />;
          })}
          {gapPreview?.kind === "aisle" && accessPoints.length
            ? (() => {
                const axis = flowAxis(accessPoints);
                const exits = accessPoints.filter((item) => item.roles.includes("exit"));
                const dest = exits.length
                  ? {
                      x: exits.reduce((sum, item) => sum + item.position.x, 0) / exits.length,
                      y: exits.reduce((sum, item) => sum + item.position.y, 0) / exits.length,
                    }
                  : { x: axis.origin.x + axis.dir.x * 0.6, y: axis.origin.y + axis.dir.y * 0.6 };
                const start = toScreen(axis.origin, frame);
                const end = toScreen(dest, frame);
                return (
                  <Line
                    points={[start.x, start.y, end.x, end.y]}
                    stroke="rgba(37,99,235,0.45)"
                    strokeWidth={Math.max(8, gapPreview.aisleWidth * frame.width)}
                    listening={false}
                  />
                );
              })()
            : null}
          {gapPreview?.kind === "gap"
            ? (() => {
                const mid = polygon.length
                  ? {
                      x: polygon.reduce((sum, p) => sum + p.x, 0) / polygon.length,
                      y: polygon.reduce((sum, p) => sum + p.y, 0) / polygon.length,
                    }
                  : { x: 0.5, y: 0.5 };
                const s = toScreen(mid, frame);
                const w = DEFAULT_BOOTH_SIZE.width * frame.width;
                const h = DEFAULT_BOOTH_SIZE.height * frame.height;
                const gap = gapPreview.boothGap * frame.width;
                return (
                  <>
                    <Rect x={s.x - gap / 2 - w} y={s.y - h / 2} width={w} height={h} fill="rgba(51,65,85,0.45)" listening={false} />
                    <Rect x={s.x + gap / 2} y={s.y - h / 2} width={w} height={h} fill="rgba(51,65,85,0.45)" listening={false} />
                  </>
                );
              })()
            : null}
          {booths.map((booth) => {
            if (!booth.position) {
              return null;
            }
            const s = toScreen(booth.position, frame);
            const size = boothSize(booth);
            const w = size.width * frame.width;
            const h = size.height * frame.height;
            return (
              <Group
                key={booth.id}
                x={s.x}
                y={s.y}
                draggable={Boolean(onMoveBooth)}
                dragDistance={6}
                onDragStart={() => {
                  dragged.current = true;
                }}
                onClick={(event) => {
                  event.cancelBubble = true;
                  if (dragged.current) {
                    dragged.current = false;
                    return;
                  }
                  onSelect(booth.id);
                }}
                onTap={(event) => {
                  event.cancelBubble = true;
                  onSelect(booth.id);
                }}
                onDragEnd={(evt) => {
                  dragged.current = false;
                  onMoveBooth?.(booth.id, { x: clamp01(evt.target.x() / frame.width), y: clamp01(evt.target.y() / frame.height) });
                }}
              >
                <Rect width={w} height={h} offsetX={w / 2} offsetY={h / 2} fill={selectedId === booth.id ? "#1d4ed8" : "#334155"} />
                <Text text={booth.name} fontSize={10} fill="#fff" offsetX={w / 2 - 4} offsetY={4} />
              </Group>
            );
          })}
          {agents.map((agent) => {
            const s = toScreen({ x: agent.x, y: agent.y }, frame);
            return <Circle key={agent.id} x={s.x} y={s.y} radius={3} fill="#111827" listening={false} />;
          })}
        </Layer>
      </Stage>
    </div>
  );
}
