import { describe, expect, it } from "vitest";
import { canEnterLayout, polygonSelfIntersects, snapToPolygon } from "./geo";

describe("venue geo", () => {
  it("detects a self-intersecting bowtie", () => {
    expect(
      polygonSelfIntersects([
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.9 },
        { x: 0.1, y: 0.9 },
        { x: 0.9, y: 0.1 },
      ]),
    ).toBe(true);
    expect(
      polygonSelfIntersects([
        { x: 0.1, y: 0.1 },
        { x: 0.9, y: 0.1 },
        { x: 0.9, y: 0.9 },
        { x: 0.1, y: 0.9 },
      ]),
    ).toBe(false);
  });

  it("snaps a point onto the outline", () => {
    const poly = [
      { x: 0.2, y: 0.2 },
      { x: 0.8, y: 0.2 },
      { x: 0.8, y: 0.8 },
      { x: 0.2, y: 0.8 },
    ];
    const snapped = snapToPolygon({ x: 0.5, y: 0.11 }, poly);
    expect(snapped.point.y).toBeCloseTo(0.2, 5);
    expect(snapped.dist).toBeLessThan(0.1);
  });

  it("blocks layout without entrance and exit", () => {
    const poly = [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ];
    expect(canEnterLayout(poly, [])).toBe(false);
    expect(
      canEnterLayout(poly, [
        { id: "e", position: { x: 0.1, y: 0.5 }, roles: ["entrance", "exit"], flowShare: 1, label: "정문" },
      ]),
    ).toBe(true);
  });
});
