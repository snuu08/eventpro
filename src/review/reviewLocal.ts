import type { Booth } from "../booth/types";
import { distanceM } from "../layout/geo";
import type { BoothPlacement, LayoutStyle } from "../layout/types";
import { LAYOUT_META } from "../layout/types";
import type { RectBounds } from "../maps/types";
import type { VenueConditions } from "../types/venue";
import { powerPoints } from "../layout/obstacles";
import { summarizeReadiness } from "../booth/status";
import type { OpsReview, ReviewAlternative, ReviewComparisonRow, ReviewFinding } from "./types";

const NEAR_M = 12;

function codes(booths: Booth[]): string {
  return booths.map((booth) => booth.code).join(", ");
}

function of(
  booths: Booth[],
  placements: BoothPlacement[],
  match: (booth: Booth) => boolean,
): { booth: Booth; placement: BoothPlacement }[] {
  const byId = new Map(placements.map((item) => [item.boothId, item]));
  return booths
    .filter(match)
    .map((booth) => {
      const placement = byId.get(booth.id);
      return placement ? { booth, placement } : null;
    })
    .filter((item): item is { booth: Booth; placement: BoothPlacement } => Boolean(item));
}

function spreadRatio(
  items: { placement: BoothPlacement }[],
  workBounds: RectBounds | null,
): number {
  if (items.length < 2 || !workBounds) {
    return 0;
  }
  const lngs = items.map((item) => item.placement.center.lng);
  const span = Math.max(...lngs) - Math.min(...lngs);
  const width = workBounds.ne.lng - workBounds.sw.lng;
  return width === 0 ? 0 : span / width;
}

function buildComparison(current: LayoutStyle, next: LayoutStyle): ReviewComparisonRow[] {
  if (next === "zone") {
    return [
      { aspect: "전력 관리", current: current === "aisle" ? "분산" : "보통", alternative: "집중 가능" },
      { aspect: "카테고리 구분", current: current === "grid" ? "약함" : "보통", alternative: "명확" },
      { aspect: "대기공간", current: current === "aisle" ? "중앙 집중" : "보통", alternative: "분산 가능" },
    ];
  }
  if (next === "aisle") {
    return [
      { aspect: "동선", current: "구역 단위", alternative: "중앙 통로" },
      { aspect: "대기공간", current: "분산 가능", alternative: "중앙 집중" },
      { aspect: "카테고리 구분", current: "명확", alternative: "보통" },
    ];
  }
  return [
    { aspect: "공간 사용", current: "성격 중심", alternative: "일정 간격" },
    { aspect: "카테고리 구분", current: "명확", alternative: "보통" },
    { aspect: "전력 관리", current: "집중 가능", alternative: "분산" },
  ];
}

export function reviewOpsLocal(
  booths: Booth[],
  style: LayoutStyle,
  placements: BoothPlacement[],
  workBounds: RectBounds | null,
  conditions: VenueConditions,
): OpsReview {
  const findings: ReviewFinding[] = [];
  const powerBooths = of(booths, placements, (booth) => booth.analysis?.power.value === "required");
  const waitingBooths = of(
    booths,
    placements,
    (booth) => booth.analysis?.waitingArea.value === "required",
  );
  const noisyBooths = of(booths, placements, (booth) => booth.analysis?.noise.value === "high");
  const consultBooths = of(
    booths,
    placements,
    (booth) => booth.analysis?.type.value === "consultation",
  );
  const waterBooths = of(booths, placements, (booth) => booth.analysis?.water.value === "required");
  const readiness = summarizeReadiness(booths);
  const powers = powerPoints(conditions);

  if (powerBooths.length > 0) {
    const spread = spreadRatio(powerBooths, workBounds);
    if (spread >= 0.55) {
      findings.push({
        topic: "power",
        message: `전력 필요 부스 ${powerBooths.length}곳(${codes(powerBooths.map((item) => item.booth))})이 행사장 양쪽으로 분산되어 있습니다.`,
      });
    } else if (powers.length > 0) {
      const far = powerBooths.filter(
        (item) => Math.min(...powers.map((point) => distanceM(item.placement.center, point))) > 25,
      );
      if (far.length > 0) {
        findings.push({
          topic: "power",
          message: `전력 필요 부스 ${codes(far.map((item) => item.booth))}이 표시된 전력 위치와 떨어져 있습니다.`,
        });
      } else {
        findings.push({
          topic: "power",
          message: `전력 필요 부스 ${powerBooths.length}곳의 위치를 전력 공급 지점과 함께 확인해 주세요.`,
        });
      }
    } else {
      findings.push({
        topic: "power",
        message: `전력 필요 부스가 ${powerBooths.length}곳입니다. 공급 위치를 지도에 표시했는지 확인해 주세요.`,
      });
    }
  }

  if (waitingBooths.length > 0) {
    if (style === "aisle") {
      findings.push({
        topic: "waiting",
        message: `대기공간이 필요한 부스 ${waitingBooths.length}곳(${codes(waitingBooths.map((item) => item.booth))})이 중앙통로 배치에 포함되어 있습니다.`,
      });
    } else {
      findings.push({
        topic: "waiting",
        message: `대기공간이 필요한 부스 ${waitingBooths.length}곳의 앞 여유 공간을 확인해 주세요.`,
      });
    }
  }

  const noisyNearConsult = noisyBooths.filter((noisy) =>
    consultBooths.some(
      (consult) => distanceM(noisy.placement.center, consult.placement.center) < NEAR_M,
    ),
  );
  if (noisyNearConsult.length > 0 && consultBooths.length > 0) {
    findings.push({
      topic: "noise",
      message: `소음이 높은 부스 ${codes(noisyNearConsult.map((item) => item.booth))}가 상담부스와 가까이 위치해 있습니다.`,
    });
  } else if (noisyBooths.length > 0) {
    findings.push({
      topic: "noise",
      message: `소음이 높은 부스 ${noisyBooths.length}곳(${codes(noisyBooths.map((item) => item.booth))})의 주변 부스 성격을 확인해 주세요.`,
    });
  }

  if (waterBooths.length > 0) {
    findings.push({
      topic: "water",
      message: `급수가 필요한 부스 ${waterBooths.length}곳(${codes(waterBooths.map((item) => item.booth))})의 급수·배수 동선을 확인해 주세요.`,
    });
  }

  if (readiness.issueCount > 0) {
    findings.push({
      topic: "readiness",
      message: `아직 운영조건이 확정되지 않은 항목이 ${readiness.issueCount}건 있습니다.`,
    });
  }

  const types = new Set(
    booths.map((booth) => booth.analysis?.type.value).filter((value): value is NonNullable<typeof value> => Boolean(value)),
  );
  if (types.size >= 3 && style !== "zone") {
    findings.push({
      topic: "type",
      message: `부스 성격이 ${types.size}종류라 유형별로 묶여 있는지 확인해 주세요.`,
    });
  }

  const limited = findings.slice(0, 6);
  const powerSpread = spreadRatio(powerBooths, workBounds) >= 0.55;
  let alternative: ReviewAlternative | null = null;

  if (powerSpread && style === "aisle") {
    alternative = {
      style: "zone",
      currentProblem: `전력 필요 부스가 양쪽에 넓게 분산되어 있습니다.`,
      reason: `${LAYOUT_META.zone.title} 배치도 검토해볼 수 있습니다. 전력 사용 부스와 유사 성격의 부스를 특정 구역에 모아 운영상 관리가 쉬워질 수 있습니다.`,
    };
  } else if (noisyNearConsult.length > 0 && style !== "zone") {
    alternative = {
      style: "zone",
      currentProblem: "소음이 높은 부스와 상담부스가 가까이 있습니다.",
      reason: `${LAYOUT_META.zone.title}으로 보면 소음 부스와 상담 부스를 구역으로 나눠 볼 수 있습니다.`,
    };
  } else if (types.size >= 3 && style === "grid") {
    alternative = {
      style: "zone",
      currentProblem: "여러 성격의 부스가 격자 안에 섞여 있습니다.",
      reason: `${LAYOUT_META.zone.title} 배치도 검토해볼 수 있습니다. 유사 성격 부스를 모아 운영 확인이 쉬워질 수 있습니다.`,
    };
  }

  return {
    findings: limited.length > 0
      ? limited
      : [
          {
            topic: "other",
            message: "현재 배치에서 바로 눈에 띄는 운영 관계는 적습니다. 부스별 운영조건과 준비상태를 한번 더 확인해 주세요.",
          },
        ],
    alternative,
    comparison: alternative ? buildComparison(style, alternative.style) : null,
    alternativeApplied: false,
    fromStyle: style,
  };
}
