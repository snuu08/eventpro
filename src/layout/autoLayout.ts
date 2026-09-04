import type {
  AccessPoint,
  EventPurpose,
  LayoutCandidate,
  LayoutRules,
  OptionalFacility,
  ProgramBooth,
  VenueObstacle,
} from "../types/eventProject";
import { UI_COPY } from "../shared/copy";
import { boothSize } from "./booth";
import { boundsOf, distance, pointInPolygon } from "./polygon";
import type { NormalizedPoint } from "../types/eventProject";
import { hitsObstacle } from "../geo/obstacleHit";

export type AutoLayoutInput = {
  venuePolygon: NormalizedPoint[];
  accessPoints: AccessPoint[];
  booths: ProgramBooth[];
  optionalFacilities: OptionalFacility[];
  obstacles?: VenueObstacle[];
  rules: LayoutRules;
  purpose: EventPurpose;
};

export type AutoLayoutResult = {
  candidates: LayoutCandidate[];
  failureReason?: string;
};

type Weights = {
  congestion: number;
  walking: number;
  entrance: number;
  exit: number;
};

const WEIGHTS: Record<"A" | "B" | "C", Weights> = {
  A: { congestion: 0.35, walking: 0.4, entrance: 0.15, exit: 0.1 },
  B: { congestion: 0.15, walking: 0.15, entrance: 0.45, exit: 0.25 },
  C: { congestion: 0.2, walking: 0.15, entrance: 0.15, exit: 0.5 },
};

function noiseLevel(booth: ProgramBooth): number {
  const noise = booth.requirements.find((item) => item.key === "noise");
  if (!noise) {
    return 0;
  }
  return { none: 0, low: 1, medium: 2, high: 3 }[noise.level];
}

function overlaps(
  a: NormalizedPoint,
  aSize: { width: number; height: number },
  b: NormalizedPoint,
  bSize: { width: number; height: number },
  gap: number,
): boolean {
  return (
    Math.abs(a.x - b.x) < (aSize.width + bSize.width) / 2 + gap &&
    Math.abs(a.y - b.y) < (aSize.height + bSize.height) / 2 + gap
  );
}

function sampleCandidates(polygon: NormalizedPoint[], step: number): NormalizedPoint[] {
  const box = boundsOf(polygon);
  const points: NormalizedPoint[] = [];
  for (let x = box.minX; x <= box.maxX; x += step) {
    for (let y = box.minY; y <= box.maxY; y += step) {
      const point = { x, y };
      if (pointInPolygon(point, polygon)) {
        points.push(point);
      }
    }
  }
  return points;
}

function isBlocked(
  point: NormalizedPoint,
  input: AutoLayoutInput,
): boolean {
  if (!pointInPolygon(point, input.venuePolygon)) {
    return true;
  }
  for (const access of input.accessPoints) {
    const clearance = access.roles.includes("entrance")
      ? input.rules.entranceClearance
      : access.roles.includes("exit")
        ? input.rules.exitClearance
        : Math.max(input.rules.entranceClearance, input.rules.exitClearance);
    if (distance(point, access.position) < clearance) {
      return true;
    }
  }
  const facilityClearance = input.rules.stageClearance ?? input.rules.aisleWidth;
  if (input.optionalFacilities.some((facility) => distance(point, facility.position) < facilityClearance)) {
    return true;
  }
  return hitsObstacle(point, input.obstacles, input.rules.aisleWidth * 0.25);
}

export type FlowAxis = {
  origin: NormalizedPoint;
  dir: NormalizedPoint;
  perp: NormalizedPoint;
};

function centroid(points: NormalizedPoint[]): NormalizedPoint {
  const n = points.length || 1;
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / n,
    y: points.reduce((sum, point) => sum + point.y, 0) / n,
  };
}

export function flowAxis(accessPoints: AccessPoint[]): FlowAxis {
  const entrances = accessPoints.filter((point) => point.roles.includes("entrance"));
  const exits = accessPoints.filter((point) => point.roles.includes("exit"));
  const origin = centroid((entrances.length ? entrances : accessPoints).map((item) => item.position));
  const dest = centroid((exits.length ? exits : accessPoints).map((item) => item.position));
  let dx = dest.x - origin.x;
  let dy = dest.y - origin.y;
  const length = Math.hypot(dx, dy);
  if (length < 1e-6) {
    dx = 1;
    dy = 0;
  } else {
    dx /= length;
    dy /= length;
  }
  return { origin, dir: { x: dx, y: dy }, perp: { x: -dy, y: dx } };
}

export function along(point: NormalizedPoint, axis: FlowAxis): number {
  return (point.x - axis.origin.x) * axis.dir.x + (point.y - axis.origin.y) * axis.dir.y;
}

export function across(point: NormalizedPoint, axis: FlowAxis): number {
  return (point.x - axis.origin.x) * axis.perp.x + (point.y - axis.origin.y) * axis.perp.y;
}

function band(usable: NormalizedPoint[], axis: FlowAxis, target: number, width: number): NormalizedPoint[] {
  return usable
    .filter((point) => Math.abs(across(point, axis) - target) <= width)
    .sort((a, b) => along(a, axis) - along(b, axis));
}

function uniquePoints(points: NormalizedPoint[]): NormalizedPoint[] {
  const seen = new Set<string>();
  const next: NormalizedPoint[] = [];
  for (const point of points) {
    const key = `${point.x.toFixed(4)},${point.y.toFixed(4)}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    next.push(point);
  }
  return next;
}

export function seedByPattern(
  usable: NormalizedPoint[],
  count: number,
  pattern: LayoutRules["pattern"],
  axis: FlowAxis,
  aisleWidth: number,
): NormalizedPoint[] {
  if (usable.length === 0 || count === 0 || pattern === "custom") {
    return [];
  }
  const width = Math.max(0.05, aisleWidth);
  const plus = band(usable, axis, aisleWidth, width);
  const minus = band(usable, axis, -aisleWidth, width);
  if (pattern === "linear") {
    const row = plus.length >= minus.length && plus.length >= count ? plus : minus.length >= count ? minus : plus.length ? plus : minus;
    return pickEven(row.length ? row : [...usable].sort((a, b) => along(a, axis) - along(b, axis)), count);
  }
  if (pattern === "facing-rows") {
    const left = pickEven(plus.length ? plus : usable, Math.ceil(count / 2));
    const right = pickEven(minus.length ? minus : usable, Math.floor(count / 2));
    return [...left, ...right].slice(0, count);
  }
  if (pattern === "u-shape") {
    const alongs = usable.map((point) => along(point, axis));
    const acrosses = usable.map((point) => across(point, axis));
    const minAlong = Math.min(...alongs);
    const maxAlong = Math.max(...alongs);
    const minAcross = Math.min(...acrosses);
    const maxAcross = Math.max(...acrosses);
    const alongSpan = maxAlong - minAlong || 1;
    const acrossSpan = maxAcross - minAcross || 1;
    const left = usable.filter((point) => across(point, axis) < minAcross + acrossSpan * 0.22);
    const right = usable.filter((point) => across(point, axis) > maxAcross - acrossSpan * 0.22);
    const far = usable.filter((point) => along(point, axis) > maxAlong - alongSpan * 0.22);
    const edge = uniquePoints([...left, ...right, ...far]).sort((a, b) => along(a, axis) - along(b, axis));
    return pickEven(edge.length ? edge : usable, count);
  }
  if (pattern === "islands") {
    const sorted = [...usable].sort((a, b) => along(a, axis) - along(b, axis));
    const groups = Math.min(count, Math.max(2, Math.ceil(count / 3)));
    const picks: NormalizedPoint[] = [];
    for (let group = 0; group < groups && picks.length < count; group += 1) {
      const start = Math.floor((group * sorted.length) / groups);
      const end = Math.floor(((group + 1) * sorted.length) / groups);
      const chunk = sorted.slice(start, Math.max(start + 1, end));
      const need = Math.ceil((count - picks.length) / (groups - group));
      for (const point of pickEven(chunk, need)) {
        if (picks.every((item) => distance(item, point) > 0.08)) {
          picks.push(point);
        }
      }
    }
    return picks.length ? picks.slice(0, count) : pickEven(sorted, count);
  }
  return pickEven([...usable].sort((a, b) => along(a, axis) - along(b, axis)), count);
}

function pickEven(points: NormalizedPoint[], count: number): NormalizedPoint[] {
  if (points.length === 0) {
    return [];
  }
  if (points.length <= count) {
    return points.slice(0, count);
  }
  return Array.from({ length: count }, (_, i) => points[Math.round((i * (points.length - 1)) / (count - 1))]);
}

function zipBooths(booths: ProgramBooth[], seeds: NormalizedPoint[]): ProgramBooth[] {
  return booths.map((booth, index) => ({
    ...booth,
    position: seeds[index % seeds.length],
    size: boothSize(booth),
  }));
}

function interleave<T>(items: T[]): T[] {
  return [...items.filter((_, index) => index % 2 === 0), ...items.filter((_, index) => index % 2 === 1)];
}

export function assignBoothsByGoal(
  booths: ProgramBooth[],
  seeds: NormalizedPoint[],
  label: "A" | "B" | "C",
  axis: FlowAxis,
  rules: LayoutRules,
): ProgramBooth[] {
  if (seeds.length === 0) {
    return booths.map((booth) => ({ ...booth, position: undefined, size: boothSize(booth) }));
  }
  const orderedSeeds = [...seeds].sort((a, b) => along(a, axis) - along(b, axis));
  const byPopularity = [...booths].sort((a, b) => b.popularity - a.popularity || a.id.localeCompare(b.id));
  let placed: ProgramBooth[];
  if (label === "B") {
    placed = zipBooths(byPopularity, interleave(orderedSeeds));
  } else if (label === "C") {
    const exitCount = Math.max(1, Math.floor(orderedSeeds.length / 4));
    const body = orderedSeeds.slice(0, Math.max(1, orderedSeeds.length - exitCount));
    const exitZone = orderedSeeds.slice(body.length);
    const least = byPopularity.slice(Math.max(0, byPopularity.length - exitZone.length));
    const rest = byPopularity.slice(0, byPopularity.length - least.length);
    const mid = Math.floor(body.length / 2);
    const bodySeeds = [...body.slice(mid), ...body.slice(0, mid)];
    placed = zipBooths([...rest, ...least], [...bodySeeds, ...exitZone]);
  } else {
    placed = zipBooths(byPopularity, orderedSeeds);
  }
  if (rules.keepNoisyZoneAwayFromQuietZone) {
    const noisy = placed.filter((item) => noiseLevel(item) >= 2);
    const quiet = placed.filter((item) => noiseLevel(item) === 0 && item.requirements.some((r) => r.key === "noise"));
    for (const loud of noisy) {
      if (!loud.position) {
        continue;
      }
      const tooClose = quiet.find((item) => item.position && distance(loud.position!, item.position) < 0.12);
      if (tooClose?.position) {
        const swap = { ...tooClose.position };
        tooClose.position = { ...loud.position };
        loud.position = swap;
      }
    }
  }
  return placed;
}

function resolveCollisions(booths: ProgramBooth[], gap: number): { booths: ProgramBooth[]; failed: boolean } {
  const next = booths.map((booth) => ({ ...booth, position: booth.position ? { ...booth.position } : undefined }));
  for (let pass = 0; pass < 8; pass += 1) {
    let hit = false;
    for (let i = 0; i < next.length; i += 1) {
      for (let j = i + 1; j < next.length; j += 1) {
        const a = next[i];
        const b = next[j];
        if (!a.position || !b.position) {
          continue;
        }
        const currentGap = pass < 4 ? gap : gap * 0.6;
        if (overlaps(a.position, boothSize(a), b.position, boothSize(b), currentGap)) {
          hit = true;
          a.position = { x: Math.min(0.98, a.position.x + 0.012), y: a.position.y };
          b.position = { x: Math.max(0.02, b.position.x - 0.012), y: b.position.y };
        }
      }
    }
    if (!hit) {
      return { booths: next, failed: false };
    }
  }
  return { booths: next, failed: true };
}

function scoreLayout(
  booths: ProgramBooth[],
  accessPoints: AccessPoint[],
  weights: Weights,
): LayoutCandidate["score"] {
  const placed = booths.filter((booth) => booth.position);
  const entrances = accessPoints.filter((point) => point.roles.includes("entrance"));
  const exits = accessPoints.filter((point) => point.roles.includes("exit"));
  const walk =
    placed.length === 0 || entrances.length === 0
      ? 0.5
      : 1 -
        placed.reduce((sum, booth) => {
          const d = entrances.reduce(
            (best, entrance) => Math.min(best, distance(booth.position!, entrance.position) * (entrance.flowShare || 1)),
            1,
          );
          return sum + d * (booth.popularity / 5) * (booth.dwellMinutes / 30);
        }, 0) /
          placed.length;

  let cluster = 0;
  let pairs = 0;
  for (let i = 0; i < placed.length; i += 1) {
    for (let j = i + 1; j < placed.length; j += 1) {
      pairs += 1;
      cluster += distance(placed[i].position!, placed[j].position!);
    }
  }
  const congestion = pairs ? Math.min(1, cluster / pairs / 0.25) : 0.5;

  const entranceDistribution =
    entrances.length <= 1 || placed.length === 0
      ? 0.6
      : 1 -
        standardDeviation(
          placed.map((booth) => {
            let nearest = 0;
            let best = Infinity;
            entrances.forEach((entrance, index) => {
              const d = distance(booth.position!, entrance.position);
              if (d < best) {
                best = d;
                nearest = index;
              }
            });
            return nearest;
          }),
        );

  const exitAccessibility =
    exits.length === 0 || placed.length === 0
      ? 0.4
      : 1 -
        placed.reduce((sum, booth) => {
          const d = Math.min(...exits.map((exit) => distance(booth.position!, exit.position)));
          return sum + d;
        }, 0) /
          placed.length;

  const clamped = {
    congestion: clamp01(congestion),
    averageWalkingDistance: clamp01(walk),
    entranceDistribution: clamp01(entranceDistribution),
    exitAccessibility: clamp01(exitAccessibility),
  };
  return {
    ...clamped,
    total:
      clamped.congestion * weights.congestion +
      clamped.averageWalkingDistance * weights.walking +
      clamped.entranceDistribution * weights.entrance +
      clamped.exitAccessibility * weights.exit,
  };
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function describe(label: "A" | "B" | "C", score: LayoutCandidate["score"]): { strengths: string[]; cautions: string[] } {
  const strengths: string[] = [];
  const cautions: string[] = [];
  if (label === "A") {
    strengths.push("평균 이동거리와 병목을 줄이는 흐름 우선 배치입니다.");
  }
  if (label === "B") {
    strengths.push("부스 가시성과 고른 방문을 높이는 노출 우선 배치입니다.");
  }
  if (label === "C") {
    strengths.push("출구 접근성과 통로 여유를 높이는 안전·여유 우선 배치입니다.");
  }
  if (score.exitAccessibility < 0.45) {
    cautions.push("출구까지 거리가 길어질 수 있습니다.");
  }
  if (score.congestion < 0.4) {
    cautions.push("인기 프로그램이 몰리면 혼잡이 커질 수 있습니다.");
  }
  return { strengths, cautions };
}

export function generateLayoutCandidates(input: AutoLayoutInput): AutoLayoutResult {
  if (input.venuePolygon.length < 3) {
    return { candidates: [], failureReason: "행사 영역을 다각형으로 그려 주세요." };
  }
  if (input.booths.length === 0) {
    return { candidates: [], failureReason: "배치할 프로그램이 없습니다." };
  }

  if (input.rules.pattern === "custom") {
    return { candidates: [], failureReason: UI_COPY.customPlaceHint };
  }

  const step = Math.max(0.03, input.rules.boothGap);
  const sampled = sampleCandidates(input.venuePolygon, step).filter((point) => !isBlocked(point, input));
  if (sampled.length < input.booths.length) {
    return { candidates: [], failureReason: UI_COPY.autoLayoutFail };
  }

  const axis = flowAxis(input.accessPoints);
  const seeds = seedByPattern(sampled, input.booths.length, input.rules.pattern, axis, input.rules.aisleWidth);
  if (seeds.length < input.booths.length) {
    return { candidates: [], failureReason: UI_COPY.autoLayoutFail };
  }

  const labels = ["A", "B", "C"] as const;
  const candidates: LayoutCandidate[] = [];
  for (const label of labels) {
    const assigned = assignBoothsByGoal(input.booths, seeds, label, axis, input.rules);
    const resolved = resolveCollisions(assigned, input.rules.boothGap);
    if (resolved.failed) {
      return { candidates: [], failureReason: "부스가 겹칩니다. 간격 완화 후에도 자리를 찾지 못했습니다." };
    }
    const score = scoreLayout(resolved.booths, input.accessPoints, WEIGHTS[label]);
    const copy = describe(label, score);
    candidates.push({
      id: `candidate-${label}`,
      label,
      booths: resolved.booths,
      score,
      strengths: copy.strengths,
      cautions: copy.cautions,
    });
  }

  return { candidates };
}

export function rescoreCandidate(
  candidate: LayoutCandidate,
  accessPoints: AccessPoint[],
): LayoutCandidate {
  const score = scoreLayout(candidate.booths, accessPoints, WEIGHTS[candidate.label]);
  const copy = describe(candidate.label, score);
  return { ...candidate, score, strengths: copy.strengths, cautions: copy.cautions };
}
