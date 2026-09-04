import { describe, expect, it } from "vitest";
import { DEFAULT_MAP_PROVIDER, DEFAULT_MAP_TYPE, mergeAcceptedPositions, MVP_EXCLUSIONS } from "./exclusions";

describe("MVP exclusions", () => {
  it("lists every paused-out product surface", () => {
    expect(MVP_EXCLUSIONS.map((item) => item.id)).toEqual([
      "auth",
      "schedule-budget",
      "payments",
      "venue-3d",
      "realtime-collab",
      "furniture",
      "safety-cert",
      "photoreal-people",
      "ai-silent-layout",
      "kakao-skyview-default",
    ]);
  });

  it("does not apply AI booth moves unless accepted", () => {
    const current = [{ id: "a", position: { x: 0.1, y: 0.1 } }, { id: "b", position: { x: 0.2, y: 0.2 } }];
    const proposed = [{ id: "a", position: { x: 0.9, y: 0.9 } }, { id: "b", position: { x: 0.8, y: 0.8 } }];
    const merged = mergeAcceptedPositions(current, proposed, new Set(["a"]));
    expect(merged[0].position).toEqual({ x: 0.9, y: 0.9 });
    expect(merged[1].position).toEqual({ x: 0.2, y: 0.2 });
  });

  it("defaults the map to Google hybrid, not Kakao skyview", () => {
    expect(DEFAULT_MAP_PROVIDER).toBe("google");
    expect(DEFAULT_MAP_TYPE).toBe("hybrid");
  });
});
