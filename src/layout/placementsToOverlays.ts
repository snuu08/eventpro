import type { Booth } from "../booth/types";
import type { MapOverlay, RectBounds } from "../maps/types";
import type { VenueConditions } from "../types/venue";
import { boothLayerStyle } from "../ops/layerStyle";
import type { OpsLayer } from "../ops/types";
import { hardViolations } from "./constraints";
import type { BoothPlacement } from "./types";

export function placementsToOverlays(
  placements: BoothPlacement[],
  workBounds: RectBounds | null,
  conditions: VenueConditions,
  booths: Booth[] = [],
  layer: OpsLayer = "all",
): MapOverlay[] {
  return placements.map((item) => {
    const others = placements.filter((other) => other.boothId !== item.boothId);
    const conflict = workBounds
      ? hardViolations({ sw: item.sw, ne: item.ne }, workBounds, conditions, others).length > 0
      : false;
    const booth = booths.find((entry) => entry.id === item.boothId);
    const style = boothLayerStyle(booth, layer);
    return {
      id: `booth:${item.boothId}`,
      type: "booth" as const,
      position: item.center,
      sw: item.sw,
      ne: item.ne,
      label: item.code,
      conflict,
      color: style.color,
      dimmed: style.dimmed,
    };
  });
}
