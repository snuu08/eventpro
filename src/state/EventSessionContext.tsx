import { useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { EventDraft } from "../types/event";
import type { GeoPoint, MapViewport } from "../maps/types";
import { createSessionFromDraft, loadSession, saveSession } from "./eventSession";
import type { EventSession } from "./eventSession";
import { EventSessionContext } from "./sessionContext";
import type { Facility, PortalKind, VenueConditions } from "../types/venue";
import { createConditionId } from "../types/venue";
import type { Booth, BoothAnalysis } from "../booth/types";
import { mergeAnalysis } from "../booth/parseAnalysis";
import type { BoothPlacement, LayoutRecommendation, LayoutState, LayoutStyle } from "../layout/types";
import { EMPTY_LAYOUT } from "../layout/types";
import type { OpsReview } from "../review/types";

function emptyConditions(): VenueConditions {
  return { portals: [], facilities: [], zones: [] };
}

function withConditions(prev: EventSession): VenueConditions {
  return prev.map?.conditions ?? emptyConditions();
}

export function EventSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<EventSession>(() => loadSession());

  const persist = useCallback((updater: (prev: EventSession) => EventSession) => {
    setSession((prev) => {
      const next = updater(prev);
      const saved = { ...next, review: next.review ?? null };
      saveSession(saved);
      return saved;
    });
  }, []);

  const createEvent = useCallback(
    (draft: EventDraft) => {
      persist(() => createSessionFromDraft(draft));
    },
    [persist],
  );

  const lockMap = useCallback(
    (viewport: MapViewport) => {
      persist((prev) => ({
        ...prev,
        map: {
          locked: true,
          viewport,
          conditions: withConditions(prev),
        },
      }));
    },
    [persist],
  );

  const unlockMap = useCallback(() => {
    persist((prev) => {
      if (!prev.map) {
        return prev;
      }
      return {
        ...prev,
        map: { ...prev.map, locked: false, conditions: withConditions(prev) },
      };
    });
  }, [persist]);

  const setMapType = useCallback(
    (mapType: MapViewport["mapType"]) => {
      persist((prev) => {
        if (!prev.map) {
          return prev;
        }
        return {
          ...prev,
          map: {
            ...prev.map,
            conditions: withConditions(prev),
            viewport: { ...prev.map.viewport, mapType },
          },
        };
      });
    },
    [persist],
  );

  const addPortal = useCallback(
    (kind: PortalKind, position: GeoPoint) => {
      persist((prev) => {
        if (!prev.map) {
          return prev;
        }
        const conditions = withConditions(prev);
        return {
          ...prev,
          map: {
            ...prev.map,
            conditions: {
              ...conditions,
              portals: [
                ...conditions.portals,
                { id: createConditionId(), kind, position },
              ],
            },
          },
        };
      });
    },
    [persist],
  );

  const addFacility = useCallback(
    (facility: Omit<Facility, "id">) => {
      persist((prev) => {
        if (!prev.map) {
          return prev;
        }
        const conditions = withConditions(prev);
        return {
          ...prev,
          map: {
            ...prev.map,
            conditions: {
              ...conditions,
              facilities: [
                ...conditions.facilities,
                { id: createConditionId(), ...facility },
              ],
            },
          },
        };
      });
    },
    [persist],
  );

  const addZone = useCallback(
    (sw: GeoPoint, ne: GeoPoint) => {
      persist((prev) => {
        if (!prev.map) {
          return prev;
        }
        const conditions = withConditions(prev);
        return {
          ...prev,
          map: {
            ...prev.map,
            conditions: {
              ...conditions,
              zones: [...conditions.zones, { id: createConditionId(), sw, ne }],
            },
          },
        };
      });
    },
    [persist],
  );

  const moveCondition = useCallback(
    (id: string, position: GeoPoint) => {
      persist((prev) => {
        if (!prev.map) {
          return prev;
        }
        const conditions = withConditions(prev);
        return {
          ...prev,
          map: {
            ...prev.map,
            conditions: {
              portals: conditions.portals.map((item) =>
                item.id === id ? { ...item, position } : item,
              ),
              facilities: conditions.facilities.map((item) =>
                item.id === id ? { ...item, position } : item,
              ),
              zones: conditions.zones,
            },
          },
        };
      });
    },
    [persist],
  );

  const removeCondition = useCallback(
    (id: string) => {
      persist((prev) => {
        if (!prev.map) {
          return prev;
        }
        const conditions = withConditions(prev);
        return {
          ...prev,
          map: {
            ...prev.map,
            conditions: {
              portals: conditions.portals.filter((item) => item.id !== id),
              facilities: conditions.facilities.filter((item) => item.id !== id),
              zones: conditions.zones.filter((item) => item.id !== id),
            },
          },
        };
      });
    },
    [persist],
  );

  const updateBooths = useCallback(
    (updater: (booths: Booth[]) => Booth[]) => {
      persist((prev) => ({
        ...prev,
        booths: updater(prev.booths ?? []),
      }));
    },
    [persist],
  );

  const recordBoothUserInput = useCallback(
    (boothId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) {
        return;
      }
      updateBooths((booths) =>
        booths.map((booth) =>
          booth.id === boothId
            ? {
                ...booth,
                description: trimmed,
                confirmed: false,
                messages: [...booth.messages, { role: "user", content: trimmed }],
              }
            : booth,
        ),
      );
    },
    [updateBooths],
  );

  const applyBoothAnalysis = useCallback(
    (boothId: string, analysis: BoothAnalysis) => {
      updateBooths((booths) =>
        booths.map((booth) => {
          if (booth.id !== boothId) {
            return booth;
          }
          const merged = mergeAnalysis(booth.analysis, analysis);
          const question = merged.followUpQuestion?.trim();
          return {
            ...booth,
            confirmed: false,
            analysis: merged,
            messages: question
              ? [...booth.messages, { role: "assistant", content: question }]
              : booth.messages,
          };
        }),
      );
    },
    [updateBooths],
  );

  const updateBoothAnalysis = useCallback(
    (boothId: string, updater: (current: BoothAnalysis) => BoothAnalysis) => {
      updateBooths((booths) =>
        booths.map((booth) => {
          if (booth.id !== boothId || !booth.analysis) {
            return booth;
          }
          return {
            ...booth,
            confirmed: false,
            analysis: updater(booth.analysis),
          };
        }),
      );
    },
    [updateBooths],
  );

  const withLayout = (prev: EventSession): LayoutState =>
    prev.layout ?? { ...EMPTY_LAYOUT, placements: [] };

  const setLayoutStyle = useCallback(
    (style: LayoutStyle) => {
      persist((prev) => ({
        ...prev,
        layout: { ...withLayout(prev), style },
      }));
    },
    [persist],
  );

  const setLayoutRecommendation = useCallback(
    (recommendation: LayoutRecommendation | null) => {
      persist((prev) => ({
        ...prev,
        layout: { ...withLayout(prev), recommendation },
      }));
    },
    [persist],
  );

  const applyLayout = useCallback(
    (patch: Pick<LayoutState, "placements" | "workBounds">) => {
      persist((prev) => ({
        ...prev,
        layout: { ...withLayout(prev), ...patch },
      }));
    },
    [persist],
  );

  const moveBoothPlacement = useCallback(
    (boothId: string, placement: BoothPlacement) => {
      persist((prev) => {
        const layout = withLayout(prev);
        return {
          ...prev,
          layout: {
            ...layout,
            placements: layout.placements.map((item) =>
              item.boothId === boothId ? placement : item,
            ),
          },
        };
      });
    },
    [persist],
  );

  const setOpsReview = useCallback(
    (review: OpsReview | null) => {
      persist((prev) => ({
        ...prev,
        review,
      }));
    },
    [persist],
  );

  const confirmBooth = useCallback(
    (boothId: string) => {
      updateBooths((booths) =>
        booths.map((booth) =>
          booth.id === boothId ? { ...booth, confirmed: true } : booth,
        ),
      );
    },
    [updateBooths],
  );

  const updateFacility = useCallback(
    (id: string, patch: Partial<Omit<Facility, "id" | "kind" | "position">>) => {
      persist((prev) => {
        if (!prev.map) {
          return prev;
        }
        const conditions = withConditions(prev);
        return {
          ...prev,
          map: {
            ...prev.map,
            conditions: {
              ...conditions,
              facilities: conditions.facilities.map((item) =>
                item.id === id ? { ...item, ...patch } : item,
              ),
            },
          },
        };
      });
    },
    [persist],
  );

  const value = useMemo(
    () => ({
      session,
      createEvent,
      lockMap,
      unlockMap,
      setMapType,
      addPortal,
      addFacility,
      addZone,
      moveCondition,
      removeCondition,
      updateFacility,
      recordBoothUserInput,
      applyBoothAnalysis,
      updateBoothAnalysis,
      confirmBooth,
      setLayoutStyle,
      setLayoutRecommendation,
      applyLayout,
      moveBoothPlacement,
      setOpsReview,
    }),
    [
      session,
      createEvent,
      lockMap,
      unlockMap,
      setMapType,
      addPortal,
      addFacility,
      addZone,
      moveCondition,
      removeCondition,
      updateFacility,
      recordBoothUserInput,
      applyBoothAnalysis,
      updateBoothAnalysis,
      confirmBooth,
      setLayoutStyle,
      setLayoutRecommendation,
      applyLayout,
      moveBoothPlacement,
      setOpsReview,
    ],
  );

  return (
    <EventSessionContext.Provider value={value}>{children}</EventSessionContext.Provider>
  );
}
