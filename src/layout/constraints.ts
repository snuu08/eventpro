import type { Booth } from "../booth/types";
import type { GeoPoint, RectBounds } from "../maps/types";
import type { VenueConditions } from "../types/venue";
import { distanceM, rectInside, rectsOverlap } from "./geo";
import { buildObstacles, powerPoints } from "./obstacles";
import type { BoothPlacement } from "./types";

export function hardViolations(
  footprint: RectBounds,
  workBounds: RectBounds,
  conditions: VenueConditions,
  others: BoothPlacement[],
): string[] {
  const issues: string[] = [];
  if (!rectInside(workBounds, footprint)) {
    issues.push("작업영역 밖으로 나갑니다.");
  }

  for (const obstacle of buildObstacles(conditions)) {
    if (!rectsOverlap(footprint, obstacle.bounds)) {
      continue;
    }
    if (obstacle.kind === "zone") {
      issues.push("설치 불가 영역을 침범합니다.");
    } else if (obstacle.kind === "portal") {
      issues.push("입구/출구를 가립니다.");
    } else {
      issues.push("고정시설 위에 놓입니다.");
    }
  }

  if (others.some((item) => rectsOverlap(footprint, { sw: item.sw, ne: item.ne }))) {
    issues.push("다른 부스와 겹칩니다.");
  }

  return [...new Set(issues)];
}

export function softWarnings(
  booth: Booth,
  center: GeoPoint,
  conditions: VenueConditions,
  placements: BoothPlacement[],
  booths: Booth[] = [],
): string[] {
  const analysis = booth.analysis;
  if (!analysis) {
    return [];
  }

  const warnings: string[] = [];
  const powers = powerPoints(conditions);
  if (analysis.power.value === "required" && powers.length > 0) {
    const nearest = Math.min(...powers.map((point) => distanceM(center, point)));
    if (nearest > 25) {
      warnings.push(
        `${booth.code}은 전력을 사용하는 부스입니다. 전력 위치와 거리가 멀어졌습니다.`,
      );
    }
  }

  if (analysis.waitingArea.value === "required") {
    const nearestNeighbor = placements
      .filter((item) => item.boothId !== booth.id)
      .reduce((min, item) => Math.min(min, distanceM(center, item.center)), Number.POSITIVE_INFINITY);
    if (nearestNeighbor < 7) {
      warnings.push(
        `${booth.code}은 대기공간이 필요한 부스입니다. 주변 공간을 확인해주세요.`,
      );
    }
  }

  if (analysis.noise.value === "high") {
    const consultIds = new Set(
      booths
        .filter((item) => item.analysis?.type.value === "consultation")
        .map((item) => item.id),
    );
    const consultNear = placements.some(
      (item) =>
        item.boothId !== booth.id &&
        consultIds.has(item.boothId) &&
        distanceM(center, item.center) < 12,
    );
    if (consultNear) {
      warnings.push(`${booth.code}은 소음이 큰 부스입니다. 상담 부스와 거리를 확인해주세요.`);
    }
  }

  return warnings;
}
