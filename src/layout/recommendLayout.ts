import type { Booth } from "../booth/types";
import type { EventType } from "../types/event";
import { recommendLayoutLocal } from "./recommendLocal";
import { LAYOUT_STYLES, type LayoutRecommendation, type LayoutStyle } from "./types";

function parseRecommendation(value: unknown): LayoutRecommendation | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as { style?: unknown; reason?: unknown };
  if (!LAYOUT_STYLES.includes(raw.style as LayoutStyle) || typeof raw.reason !== "string") {
    return null;
  }
  return {
    style: raw.style as LayoutStyle,
    reason: raw.reason.trim().slice(0, 200) || "세 가지 방식 중 하나를 골랐습니다.",
  };
}

export async function recommendLayout(
  eventType: EventType,
  booths: Booth[],
): Promise<LayoutRecommendation> {
  const fallback = recommendLayoutLocal(eventType, booths);

  try {
    const response = await fetch("/api/recommend-layout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType,
        boothCount: booths.length,
        types: booths.map((booth) => booth.analysis?.type.value ?? "unknown"),
        powerRequired: booths.filter((booth) => booth.analysis?.power.value === "required").length,
        waitingRequired: booths.filter((booth) => booth.analysis?.waitingArea.value === "required").length,
        noisy: booths.filter((booth) => booth.analysis?.noise.value === "high").length,
      }),
    });
    const payload = (await response.json()) as { recommendation?: unknown; error?: string };
    const parsed = parseRecommendation(payload.recommendation);
    if (response.ok && parsed) {
      return parsed;
    }
    return fallback;
  } catch {
    return fallback;
  }
}
