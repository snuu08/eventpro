import { describe, expect, it } from "vitest";
import { hitsObstacle } from "./obstacleHit";
import type { VenueObstacle } from "../types/eventProject";

const block: VenueObstacle = {
  id: "osm-way/1",
  source: "osm",
  type: "building",
  osmId: "way/1",
  geoGeometry: [],
  normalizedGeometry: [
    { x: 0.4, y: 0.4 },
    { x: 0.6, y: 0.4 },
    { x: 0.6, y: 0.6 },
    { x: 0.4, y: 0.6 },
  ],
  confirmed: true,
};

describe("obstacle hit", () => {
  it("blocks points inside a confirmed building", () => {
    expect(hitsObstacle({ x: 0.5, y: 0.5 }, [block])).toBe(true);
    expect(hitsObstacle({ x: 0.1, y: 0.1 }, [block])).toBe(false);
  });

  it("ignores hidden obstacles", () => {
    expect(hitsObstacle({ x: 0.5, y: 0.5 }, [{ ...block, confirmed: false }])).toBe(false);
  });
});
