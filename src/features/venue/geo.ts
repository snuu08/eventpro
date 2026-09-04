import { distance } from "../../layout/polygon";
import type { AccessPoint, NormalizedPoint } from "../../types/eventProject";

function orient(a: NormalizedPoint, b: NormalizedPoint, c: NormalizedPoint): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y);
}

function onSeg(a: NormalizedPoint, b: NormalizedPoint, c: NormalizedPoint): boolean {
  return (
    Math.min(a.x, b.x) - 1e-9 <= c.x &&
    c.x <= Math.max(a.x, b.x) + 1e-9 &&
    Math.min(a.y, b.y) - 1e-9 <= c.y &&
    c.y <= Math.max(a.y, b.y) + 1e-9
  );
}

function segmentsCross(a: NormalizedPoint, b: NormalizedPoint, c: NormalizedPoint, d: NormalizedPoint): boolean {
  const o1 = orient(a, b, c);
  const o2 = orient(a, b, d);
  const o3 = orient(c, d, a);
  const o4 = orient(c, d, b);
  if (o1 === 0 && onSeg(a, b, c)) {
    return true;
  }
  if (o2 === 0 && onSeg(a, b, d)) {
    return true;
  }
  if (o3 === 0 && onSeg(c, d, a)) {
    return true;
  }
  if (o4 === 0 && onSeg(c, d, b)) {
    return true;
  }
  return o1 * o2 < 0 && o3 * o4 < 0;
}

export function polygonSelfIntersects(polygon: NormalizedPoint[]): boolean {
  const n = polygon.length;
  if (n < 4) {
    return false;
  }
  for (let i = 0; i < n; i += 1) {
    const a1 = polygon[i];
    const a2 = polygon[(i + 1) % n];
    for (let j = i + 1; j < n; j += 1) {
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) {
        continue;
      }
      const b1 = polygon[j];
      const b2 = polygon[(j + 1) % n];
      if (segmentsCross(a1, a2, b1, b2)) {
        return true;
      }
    }
  }
  return false;
}

export function polygonArea(polygon: NormalizedPoint[]): number {
  let sum = 0;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    sum += polygon[j].x * polygon[i].y - polygon[i].x * polygon[j].y;
  }
  return Math.abs(sum) / 2;
}

export function closestOnSegment(point: NormalizedPoint, a: NormalizedPoint, b: NormalizedPoint): NormalizedPoint {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy || 1e-9;
  const t = Math.min(1, Math.max(0, ((point.x - a.x) * dx + (point.y - a.y) * dy) / len));
  return { x: a.x + dx * t, y: a.y + dy * t };
}

export function snapToPolygon(point: NormalizedPoint, polygon: NormalizedPoint[]): { point: NormalizedPoint; dist: number } {
  let best = polygon[0];
  let bestDist = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const snapped = closestOnSegment(point, polygon[j], polygon[i]);
    const dist = distance(point, snapped);
    if (dist < bestDist) {
      bestDist = dist;
      best = snapped;
    }
  }
  return { point: best, dist: bestDist };
}

export function validateVenue(polygon: NormalizedPoint[], access: AccessPoint[]): string | null {
  if (polygon.length < 3) {
    return "행사 영역은 점 3개 이상의 다각형이어야 합니다.";
  }
  if (polygon.some((p) => p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1)) {
    return "영역 점이 고정 프레임 밖으로 나갔습니다.";
  }
  if (polygonSelfIntersects(polygon)) {
    return "영역이 스스로 교차합니다. 점을 조정해 주세요.";
  }
  if (polygonArea(polygon) < 0.004) {
    return "영역이 너무 작습니다.";
  }
  const hasIn = access.some((item) => item.roles.includes("entrance"));
  const hasOut = access.some((item) => item.roles.includes("exit"));
  if (!hasIn || !hasOut) {
    return "입구 1개와 출구 1개를 지정해야 배치를 만들 수 있어요.";
  }
  return null;
}

export function canEnterLayout(polygon: NormalizedPoint[], access: AccessPoint[]): boolean {
  return validateVenue(polygon, access) === null;
}
