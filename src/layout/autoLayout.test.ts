import { describe, expect, it } from "vitest";
import { along, assignBoothsByGoal, flowAxis, generateLayoutCandidates, seedByPattern } from "./autoLayout";
import type { AccessPoint, LayoutRules, ProgramBooth } from "../types/eventProject";
import { UI_COPY } from "../shared/copy";

const rules: LayoutRules = {
  pattern: "linear",
  aisleWidth: 0.04,
  boothGap: 0.03,
  entranceClearance: 0.06,
  exitClearance: 0.06,
  keepPopularBoothsApart: true,
  keepNoisyZoneAwayFromQuietZone: true,
};

const access: AccessPoint[] = [
  { id: "in", position: { x: 0.12, y: 0.5 }, roles: ["entrance"], flowShare: 1, label: "입구" },
  { id: "out", position: { x: 0.88, y: 0.5 }, roles: ["exit"], flowShare: 1, label: "출구" },
];

const booths: ProgramBooth[] = [
  { id: "hot", name: "인기", description: "", category: "", dwellMinutes: 8, capacity: 10, popularity: 5, requirements: [] },
  { id: "mid", name: "중간", description: "", category: "", dwellMinutes: 8, capacity: 10, popularity: 3, requirements: [] },
  { id: "low", name: "한산", description: "", category: "", dwellMinutes: 8, capacity: 10, popularity: 1, requirements: [] },
];

const polygon = [
  { x: 0.1, y: 0.2 },
  { x: 0.9, y: 0.2 },
  { x: 0.9, y: 0.8 },
  { x: 0.1, y: 0.8 },
];

function grid(): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let x = 0.2; x <= 0.8; x += 0.05) {
    for (let y = 0.3; y <= 0.7; y += 0.05) {
      points.push({ x, y });
    }
  }
  return points;
}

describe("entrance-exit auto layout", () => {
  it("builds an axis from entrance toward exit", () => {
    const axis = flowAxis(access);
    expect(axis.dir.x).toBeGreaterThan(0.9);
    expect(Math.abs(axis.dir.y)).toBeLessThan(0.1);
  });

  it("places a linear row along the flow, not across the screen y-mid only", () => {
    const axis = flowAxis(access);
    const seeds = seedByPattern(grid(), 4, "linear", axis, 0.04);
    expect(seeds).toHaveLength(4);
    const xs = seeds.map((p) => p.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(0.15);
  });

  it("puts facing rows on both sides of the aisle", () => {
    const axis = flowAxis(access);
    const seeds = seedByPattern(grid(), 6, "facing-rows", axis, 0.04);
    const ys = seeds.map((p) => p.y);
    expect(Math.min(...ys)).toBeLessThan(0.5);
    expect(Math.max(...ys)).toBeGreaterThan(0.5);
  });

  it("assigns popular booths nearer the entrance for A than for C", () => {
    const axis = flowAxis(access);
    const seeds = seedByPattern(grid(), 3, "linear", axis, 0.04);
    const a = assignBoothsByGoal(booths, seeds, "A", axis, rules);
    const c = assignBoothsByGoal(booths, seeds, "C", axis, rules);
    const aHot = a.find((item) => item.id === "hot")!.position!;
    const cHot = c.find((item) => item.id === "hot")!.position!;
    const cLow = c.find((item) => item.id === "low")!.position!;
    expect(along(aHot, axis)).toBeLessThan(along(cHot, axis));
    expect(along(cHot, axis)).toBeLessThanOrEqual(along(cLow, axis));
    const aPos = a.map((item) => `${item.id}:${item.position?.x.toFixed(3)}`);
    const bPos = assignBoothsByGoal(booths, seeds, "B", axis, rules).map(
      (item) => `${item.id}:${item.position?.x.toFixed(3)}`,
    );
    expect(aPos).not.toEqual(bPos);
  });

  it("does not auto-place custom pattern", () => {
    const result = generateLayoutCandidates({
      venuePolygon: polygon,
      accessPoints: access,
      booths,
      optionalFacilities: [],
      rules: { ...rules, pattern: "custom" },
      purpose: "market",
    });
    expect(result.candidates).toEqual([]);
    expect(result.failureReason).toBe(UI_COPY.customPlaceHint);
  });

  it("builds A B C for linear", () => {
    const result = generateLayoutCandidates({
      venuePolygon: polygon,
      accessPoints: access,
      booths,
      optionalFacilities: [],
      rules,
      purpose: "market",
    });
    expect(result.candidates.map((item) => item.label)).toEqual(["A", "B", "C"]);
    expect(result.candidates.every((item) => item.booths.every((booth) => booth.position))).toBe(true);
  });

  it("keeps auto-layout booths off OSM buildings", () => {
    const result = generateLayoutCandidates({
      venuePolygon: polygon,
      accessPoints: access,
      booths,
      optionalFacilities: [],
      obstacles: [
        {
          id: "block",
          source: "osm",
          type: "building",
          osmId: "way/1",
          geoGeometry: [],
          normalizedGeometry: [
            { x: 0.35, y: 0.35 },
            { x: 0.65, y: 0.35 },
            { x: 0.65, y: 0.65 },
            { x: 0.35, y: 0.65 },
          ],
          confirmed: true,
        },
      ],
      rules,
      purpose: "market",
    });
    expect(result.candidates.length).toBeGreaterThan(0);
    for (const candidate of result.candidates) {
      for (const booth of candidate.booths) {
        const p = booth.position!;
        expect(p.x < 0.35 || p.x > 0.65 || p.y < 0.35 || p.y > 0.65).toBe(true);
      }
    }
  });
});
