import type { EventDraft } from "../types/event";
import type { MapViewport } from "../maps/types";
import { DEFAULT_VIEWPORT } from "../maps/types";
import type { VenueConditions } from "../types/venue";
import { parseConditions } from "../types/venue";
import type { Booth } from "../booth/types";
import { generateBooths } from "../booth/generateBooths";
import { parseBooths } from "../booth/parseBooths";
import type { LayoutState } from "../layout/types";
import { EMPTY_LAYOUT } from "../layout/types";
import { parseLayout } from "../layout/parseLayout";
import type { OpsReview } from "../review/types";
import { parseOpsReview } from "../review/parseReview";

export const SESSION_STORAGE_KEY = "eventpro:phase1";

export interface EventMapState {
  locked: boolean;
  viewport: MapViewport;
  conditions: VenueConditions;
}

export interface EventSession {
  draft: EventDraft | null;
  map: EventMapState | null;
  booths: Booth[];
  layout: LayoutState;
  review: OpsReview | null;
}

export const EMPTY_SESSION: EventSession = {
  draft: null,
  map: null,
  booths: [],
  layout: { ...EMPTY_LAYOUT, placements: [] },
  review: null,
};

function parseViewport(raw: EventMapState["viewport"] | undefined): MapViewport {
  return {
    center: {
      lat: Number(raw?.center?.lat) || DEFAULT_VIEWPORT.center.lat,
      lng: Number(raw?.center?.lng) || DEFAULT_VIEWPORT.center.lng,
    },
    zoom: Number(raw?.zoom) || DEFAULT_VIEWPORT.zoom,
    mapType: raw?.mapType === "skyview" ? "skyview" : "roadmap",
  };
}

export function loadSession(): EventSession {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return EMPTY_SESSION;
    }

    const parsed = JSON.parse(raw) as EventSession;
    if (!parsed || typeof parsed !== "object") {
      return EMPTY_SESSION;
    }

    const boothCount = parsed.draft?.boothCount ?? 0;
    const layout = parseLayout(parsed.layout);
    return {
      draft: parsed.draft ?? null,
      booths: parseBooths(parsed.booths, boothCount),
      layout,
      review: parseOpsReview(parsed.review, layout.style),
      map: parsed.map
        ? {
            locked: Boolean(parsed.map.locked),
            viewport: parseViewport(parsed.map.viewport),
            conditions: parseConditions(parsed.map.conditions),
          }
        : null,
    };
  } catch {
    return EMPTY_SESSION;
  }
}

export function saveSession(session: EventSession): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export function createSessionFromDraft(draft: EventDraft): EventSession {
  return {
    draft,
    booths: generateBooths(draft.boothCount),
    layout: { ...EMPTY_LAYOUT, placements: [] },
    review: null,
    map: {
      locked: false,
      viewport: DEFAULT_VIEWPORT,
      conditions: { portals: [], facilities: [], zones: [] },
    },
  };
}
