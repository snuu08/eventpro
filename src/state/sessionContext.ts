import { createContext } from "react";
import type { EventDraft } from "../types/event";
import type { GeoPoint, MapViewport } from "../maps/types";
import type { EventSession } from "./eventSession";
import type { Facility, PortalKind } from "../types/venue";
import type { BoothAnalysis } from "../booth/types";
import type { BoothPlacement, LayoutRecommendation, LayoutState, LayoutStyle } from "../layout/types";
import type { OpsReview } from "../review/types";

export interface EventSessionContextValue {
  session: EventSession;
  createEvent: (draft: EventDraft) => void;
  lockMap: (viewport: MapViewport) => void;
  unlockMap: () => void;
  setMapType: (mapType: MapViewport["mapType"]) => void;
  addPortal: (kind: PortalKind, position: GeoPoint) => void;
  addFacility: (facility: Omit<Facility, "id">) => void;
  addZone: (sw: GeoPoint, ne: GeoPoint) => void;
  moveCondition: (id: string, position: GeoPoint) => void;
  removeCondition: (id: string) => void;
  updateFacility: (id: string, patch: Partial<Omit<Facility, "id" | "kind" | "position">>) => void;
  recordBoothUserInput: (boothId: string, text: string) => void;
  applyBoothAnalysis: (boothId: string, analysis: BoothAnalysis) => void;
  updateBoothAnalysis: (
    boothId: string,
    updater: (current: BoothAnalysis) => BoothAnalysis,
  ) => void;
  confirmBooth: (boothId: string) => void;
  setLayoutStyle: (style: LayoutStyle) => void;
  setLayoutRecommendation: (recommendation: LayoutRecommendation | null) => void;
  applyLayout: (patch: Pick<LayoutState, "placements" | "workBounds">) => void;
  moveBoothPlacement: (boothId: string, placement: BoothPlacement) => void;
  setOpsReview: (review: OpsReview | null) => void;
}

export const EventSessionContext = createContext<EventSessionContextValue | null>(
  null,
);
