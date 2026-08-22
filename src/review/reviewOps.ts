import type { Booth } from "../booth/types";
import type { BoothPlacement, LayoutStyle } from "../layout/types";
import type { RectBounds } from "../maps/types";
import type { EventDraft } from "../types/event";
import type { VenueConditions } from "../types/venue";
import { buildReviewPayload } from "./buildReviewPayload";
import { parseOpsReview } from "./parseReview";
import { reviewOpsLocal } from "./reviewLocal";
import type { OpsReview } from "./types";

export async function reviewOps(
  draft: EventDraft,
  conditions: VenueConditions,
  booths: Booth[],
  style: LayoutStyle,
  placements: BoothPlacement[],
  workBounds: RectBounds | null,
  map: { zoom: number; mapType: string },
): Promise<OpsReview> {
  const fallback = reviewOpsLocal(booths, style, placements, workBounds, conditions);
  const payload = buildReviewPayload(draft, conditions, booths, style, placements, workBounds, map);

  try {
    const response = await fetch("/api/review-ops", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = (await response.json()) as { review?: unknown; error?: string };
    const parsed = parseOpsReview(body.review, style);
    if (response.ok && parsed) {
      return parsed;
    }
    return fallback;
  } catch {
    return fallback;
  }
}
