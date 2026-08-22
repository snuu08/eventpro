import type { Booth, BoothType } from "../booth/types";
import type { GeoPoint, RectBounds } from "../maps/types";
import type { VenueConditions } from "../types/venue";
import { hardViolations } from "./constraints";
import {
  boundsHeightM,
  boundsWidthM,
  distanceM,
  isUsableBounds,
  offsetPoint,
  rectFromCenter,
  shrinkBounds,
} from "./geo";
import { buildObstacles, powerPoints } from "./obstacles";
import {
  AISLE_WIDTH_M,
  BOOTH_GAP_M,
  BOOTH_SIZE_M,
  WORK_PAD_M,
  type BoothPlacement,
  type LayoutStyle,
} from "./types";

export interface PlaceBoothsResult {
  placements: BoothPlacement[];
  unplaced: string[];
}

interface ScoredSlot {
  center: GeoPoint;
  region?: string;
}

function footprintAt(center: GeoPoint): RectBounds {
  return rectFromCenter(center, BOOTH_SIZE_M.width, BOOTH_SIZE_M.height);
}

function slotFits(
  center: GeoPoint,
  workBounds: RectBounds,
  conditions: VenueConditions,
  occupied: BoothPlacement[],
): boolean {
  return hardViolations(footprintAt(center), workBounds, conditions, occupied).length === 0;
}

function generateGrid(region: RectBounds, stepEast: number, stepNorth: number): GeoPoint[] {
  if (!isUsableBounds(region)) {
    return [];
  }

  const origin = offsetPoint(region.sw, BOOTH_SIZE_M.width / 2, BOOTH_SIZE_M.height / 2);
  const points: GeoPoint[] = [];
  const maxLat = region.ne.lat;
  const maxLng = region.ne.lng;

  for (let row = 0; row < 80; row += 1) {
    const lat = offsetPoint(origin, 0, row * stepNorth).lat;
    if (lat > maxLat) {
      break;
    }
    for (let col = 0; col < 80; col += 1) {
      const point = offsetPoint({ lat, lng: origin.lng }, col * stepEast, 0);
      if (point.lng > maxLng) {
        break;
      }
      points.push(point);
    }
  }
  return points;
}

function generateSlots(style: LayoutStyle, workBounds: RectBounds): ScoredSlot[] {
  const stepEast = BOOTH_SIZE_M.width + BOOTH_GAP_M;
  const stepNorth = BOOTH_SIZE_M.height + BOOTH_GAP_M;

  if (style === "aisle") {
    const widthM = boundsWidthM(workBounds);
    const heightM = boundsHeightM(workBounds);
    const mid = {
      lat: (workBounds.sw.lat + workBounds.ne.lat) / 2,
      lng: (workBounds.sw.lng + workBounds.ne.lng) / 2,
    };

    if (widthM >= heightM) {
      const half = AISLE_WIDTH_M / 2;
      const left = { sw: workBounds.sw, ne: { lat: workBounds.ne.lat, lng: offsetPoint(mid, -half, 0).lng } };
      const right = { sw: { lat: workBounds.sw.lat, lng: offsetPoint(mid, half, 0).lng }, ne: workBounds.ne };
      return [
        ...generateGrid(left, stepEast, stepNorth).map((center) => ({ center, region: "west" })),
        ...generateGrid(right, stepEast, stepNorth).map((center) => ({ center, region: "east" })),
      ];
    }

    const half = AISLE_WIDTH_M / 2;
    const south = { sw: workBounds.sw, ne: { lat: offsetPoint(mid, 0, -half).lat, lng: workBounds.ne.lng } };
    const north = { sw: { lat: offsetPoint(mid, 0, half).lat, lng: workBounds.sw.lng }, ne: workBounds.ne };
    return [
      ...generateGrid(south, stepEast, stepNorth).map((center) => ({ center, region: "south" })),
      ...generateGrid(north, stepEast, stepNorth).map((center) => ({ center, region: "north" })),
    ];
  }

  const points = generateGrid(workBounds, stepEast, stepNorth);
  if (style !== "zone") {
    return points.map((center) => ({ center }));
  }

  const cols = 3;
  const minLng = workBounds.sw.lng;
  const span = workBounds.ne.lng - workBounds.sw.lng || 1;
  return points.map((center) => ({
    center,
    region: String(Math.min(cols - 1, Math.floor(((center.lng - minLng) / span) * cols))),
  }));
}

function boothType(booth: Booth): BoothType {
  return booth.analysis?.type.value ?? "other";
}

function preferredRegion(type: BoothType, types: BoothType[]): string {
  const unique = [...new Set(types)];
  const index = Math.max(0, unique.indexOf(type));
  return String(index % 3);
}

function scoreSlot(
  booth: Booth,
  slot: ScoredSlot,
  style: LayoutStyle,
  conditions: VenueConditions,
  occupied: BoothPlacement[],
  allBooths: Booth[],
): number {
  let score = 0;
  const analysis = booth.analysis;
  const powers = powerPoints(conditions);

  if (analysis?.power.value === "required" && powers.length > 0) {
    score -= Math.min(...powers.map((point) => distanceM(slot.center, point)));
  }

  if (analysis?.waitingArea.value === "required") {
    const obstacles = buildObstacles(conditions);
    const clear = [
      ...obstacles.map((item) => distanceM(slot.center, {
        lat: (item.bounds.sw.lat + item.bounds.ne.lat) / 2,
        lng: (item.bounds.sw.lng + item.bounds.ne.lng) / 2,
      })),
      ...occupied.map((item) => distanceM(slot.center, item.center)),
    ];
    score += Math.min(...clear, 40);
  }

  if (analysis?.noise.value === "high") {
    const consult = occupied.filter((item) => {
      const other = allBooths.find((boothItem) => boothItem.id === item.boothId);
      return other?.analysis?.type.value === "consultation";
    });
    if (consult.length > 0) {
      score += Math.min(...consult.map((item) => distanceM(slot.center, item.center)));
    }
  }

  if (style === "zone") {
    const region = preferredRegion(boothType(booth), allBooths.map(boothType));
    if (slot.region === region) {
      score += 80;
    }
  }

  return score;
}

function orderedBooths(booths: Booth[], style: LayoutStyle): Booth[] {
  if (style !== "zone") {
    return [...booths];
  }
  return [...booths].sort((a, b) => {
    const typeOrder = boothType(a).localeCompare(boothType(b));
    return typeOrder !== 0 ? typeOrder : a.code.localeCompare(b.code);
  });
}

export function placeBooths(
  booths: Booth[],
  style: LayoutStyle,
  mapBounds: RectBounds,
  conditions: VenueConditions,
): PlaceBoothsResult {
  const workBounds = shrinkBounds(mapBounds, WORK_PAD_M);
  if (!isUsableBounds(workBounds) || booths.length === 0) {
    return { placements: [], unplaced: booths.map((item) => item.code) };
  }

  const candidates = generateSlots(style, workBounds).filter((slot) =>
    slotFits(slot.center, workBounds, conditions, []),
  );

  const placements: BoothPlacement[] = [];
  const unplaced: string[] = [];
  const used = new Set<string>();

  for (const booth of orderedBooths(booths, style)) {
    let best: ScoredSlot | null = null;
    let bestScore = Number.NEGATIVE_INFINITY;

    for (const slot of candidates) {
      const key = `${slot.center.lat}:${slot.center.lng}`;
      if (used.has(key)) {
        continue;
      }
      if (!slotFits(slot.center, workBounds, conditions, placements)) {
        continue;
      }
      const score = scoreSlot(booth, slot, style, conditions, placements, booths);
      if (score > bestScore) {
        best = slot;
        bestScore = score;
      }
    }

    if (!best) {
      unplaced.push(booth.code);
      continue;
    }

    const box = footprintAt(best.center);
    used.add(`${best.center.lat}:${best.center.lng}`);
    placements.push({
      boothId: booth.id,
      code: booth.code,
      center: best.center,
      sw: box.sw,
      ne: box.ne,
    });
  }

  return { placements, unplaced };
}
