import type { LayoutCandidate } from "../types/eventProject";

export type ScoreChange = {
  key: "congestion" | "averageWalkingDistance" | "entranceDistribution" | "exitAccessibility" | "total";
  label: string;
  before: number;
  after: number;
  delta: number;
  worsened: boolean;
};

const LABELS = {
  congestion: "혼잡(추정)",
  averageWalkingDistance: "평균 이동거리(추정)",
  entranceDistribution: "입구 분산(추정)",
  exitAccessibility: "출구 접근성(추정)",
  total: "종합(추정)",
} as const;

export function compareManualMove(before: LayoutCandidate, after: LayoutCandidate): ScoreChange[] {
  const keys = Object.keys(LABELS) as Array<keyof typeof LABELS>;
  return keys
    .map((key) => {
      const prev = before.score[key];
      const next = after.score[key];
      const delta = next - prev;
      return {
        key,
        label: LABELS[key],
        before: prev,
        after: next,
        delta,
        worsened: delta < -0.01,
      };
    })
    .filter((item) => Math.abs(item.delta) >= 0.01);
}

export const REVERT_TO_AUTO_CONFIRM =
  "자동 배치로 되돌리면 직접 옮긴 위치가 사라집니다. 되돌릴까요?";
