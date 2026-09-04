import type { EventPurpose, LayoutCandidate } from "../types/eventProject";

const PURPOSE_PREFERS: Record<EventPurpose, LayoutCandidate["label"]> = {
  experience: "A",
  promotion: "B",
  market: "B",
  performance: "C",
  networking: "A",
  custom: "A",
};

const WHEN_BETTER: Record<LayoutCandidate["label"], string> = {
  A: "이동이 길고 입구에 사람이 몰릴 때 더 유리합니다.",
  B: "홍보·판매처럼 부스 노출과 고른 방문이 중요할 때 더 유리합니다.",
  C: "비상 퇴장·통로 여유·출구 접근이 우선일 때 더 유리합니다.",
};

const PURPOSE_REASON: Record<EventPurpose, string> = {
  experience: "체험 행사는 대기와 이동이 겹치기 쉬워 흐름을 우선한 안이 맞습니다.",
  promotion: "홍보·정책 안내는 많은 사람이 프로그램을 지나쳐 보도록 노출을 우선합니다.",
  market: "플리마켓·판매는 가시성과 고른 방문이 매출과 체류에 영향을 줍니다.",
  performance: "공연·무대는 몰림과 퇴장이 커서 출구 접근과 통로 여유가 중요합니다.",
  networking: "네트워킹은 구간을 오가는 이동이 많아 평균 이동거리를 줄이는 편이 낫습니다.",
  custom: "선택한 목적에서는 병목과 이동을 줄이는 흐름 우선 안을 기본으로 둡니다.",
};

export type CandidateExplanation = {
  selectedWhy: string;
  alternatives: Array<{ label: LayoutCandidate["label"]; whenBetter: string }>;
};

export function explainSelection(
  purpose: EventPurpose,
  candidates: LayoutCandidate[],
  selectedId: string,
): CandidateExplanation {
  const selected = candidates.find((item) => item.id === selectedId);
  if (!selected) {
    return { selectedWhy: "배치안을 선택해 주세요.", alternatives: [] };
  }
  const preferred = PURPOSE_PREFERS[purpose];
  const selectedWhy =
    selected.label === preferred
      ? PURPOSE_REASON[purpose]
      : `${PURPOSE_REASON[purpose]} 다만 지금 고른 ${selected.label}안은 ${WHEN_BETTER[selected.label]}`;
  return {
    selectedWhy,
    alternatives: candidates
      .filter((item) => item.id !== selectedId)
      .map((item) => ({ label: item.label, whenBetter: WHEN_BETTER[item.label] })),
  };
}
