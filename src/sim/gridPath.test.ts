import { describe, expect, it } from "vitest";
import { buildWalkGrid, worldToCell } from "./gridPath";
import type { VenueObstacle } from "../types/eventProject";

const polygon = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
];

const building: VenueObstacle = {
  id: "o1",
  source: "osm",
  type: "building",
  osmId: "way/9",
  geoGeometry: [],
  normalizedGeometry: [
    { x: 0.4, y: 0.4 },
    { x: 0.6, y: 0.4 },
    { x: 0.6, y: 0.6 },
    { x: 0.4, y: 0.6 },
  ],
  confirmed: true,
};

describe("walk grid obstacles", () => {
  it("marks building cells as not walkable", () => {
    const grid = buildWalkGrid(polygon, [], 0.03, [building]);
    const mid = worldToCell({ x: 0.5, y: 0.5 });
    const corner = worldToCell({ x: 0.05, y: 0.05 });
    expect(grid.walkable[mid.r][mid.c]).toBe(false);
    expect(grid.walkable[corner.r][corner.c]).toBe(true);
  });
});
