import { reviewReasons } from "../booth/status";
import { BOOTH_TYPE_LABELS, LEVEL_LABELS, TERNARY_LABELS } from "../booth/labels";
import type { Booth } from "../booth/types";
import { LAYOUT_META, type LayoutStyle } from "../layout/types";
import type { BoothPlacement } from "../layout/types";
import type { RectBounds } from "../maps/types";
import type { EventDraft } from "../types/event";
import { FACILITY_LABELS, PORTAL_LABELS, type VenueConditions } from "../types/venue";

function relativePosition(center: { lat: number; lng: number }, bounds: RectBounds | null) {
  if (!bounds) {
    return { x: 0.5, y: 0.5 };
  }
  const width = bounds.ne.lng - bounds.sw.lng;
  const height = bounds.ne.lat - bounds.sw.lat;
  return {
    x: width === 0 ? 0.5 : Number(((center.lng - bounds.sw.lng) / width).toFixed(2)),
    y: height === 0 ? 0.5 : Number(((center.lat - bounds.sw.lat) / height).toFixed(2)),
  };
}

export function buildReviewPayload(
  draft: EventDraft,
  conditions: VenueConditions,
  booths: Booth[],
  style: LayoutStyle,
  placements: BoothPlacement[],
  workBounds: RectBounds | null,
  map: { zoom: number; mapType: string },
) {
  const placementById = new Map(placements.map((item) => [item.boothId, item]));

  return {
    event: {
      name: draft.name,
      type: draft.eventType,
      attendees: draft.expectedAttendees,
      boothCount: draft.boothCount,
    },
    map: {
      zoom: map.zoom,
      mapType: map.mapType,
    },
    portals: conditions.portals.map((portal) => ({ kind: PORTAL_LABELS[portal.kind] })),
    noInstallZones: conditions.zones.length,
    facilities: conditions.facilities.map((facility) => ({
      kind: FACILITY_LABELS[facility.kind],
      label: facility.label || undefined,
    })),
    layout: {
      style,
      styleLabel: LAYOUT_META[style].title,
      placedCount: placements.length,
    },
    booths: booths.map((booth) => {
      const analysis = booth.analysis;
      const placement = placementById.get(booth.id);
      return {
        code: booth.code,
        type: analysis ? BOOTH_TYPE_LABELS[analysis.type.value] : "미정",
        power: analysis ? TERNARY_LABELS[analysis.power.value] : "미정",
        internet: analysis ? TERNARY_LABELS[analysis.internet.value] : "미정",
        water: analysis ? TERNARY_LABELS[analysis.water.value] : "미정",
        drainage: analysis ? TERNARY_LABELS[analysis.drainage.value] : "미정",
        waiting: analysis ? TERNARY_LABELS[analysis.waitingArea.value] : "미정",
        storage: analysis ? TERNARY_LABELS[analysis.storage.value] : "미정",
        waste: analysis ? LEVEL_LABELS[analysis.waste.value] : "미정",
        noise: analysis ? LEVEL_LABELS[analysis.noise.value] : "미정",
        confirmed: booth.confirmed,
        reviewItems: analysis ? reviewReasons(analysis) : ["프로그램 설명 부족"],
        relativePosition: placement
          ? relativePosition(placement.center, workBounds)
          : null,
      };
    }),
    unconfirmed: booths
      .filter((booth) => !booth.confirmed || !booth.analysis || reviewReasons(booth.analysis).length > 0)
      .map((booth) => ({
        code: booth.code,
        issues: booth.analysis ? reviewReasons(booth.analysis) : ["프로그램 설명 부족"],
      })),
  };
}
