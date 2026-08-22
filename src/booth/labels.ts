import type { BoothStatus, BoothType, LevelNeed, TernaryNeed } from "./types";

export const BOOTH_TYPE_LABELS: Record<BoothType, string> = {
  experience: "체험",
  promotion: "홍보",
  consultation: "상담",
  sales: "판매",
  exhibition: "전시",
  food: "음식",
  event: "이벤트",
  other: "기타",
};

export const TERNARY_LABELS: Record<TernaryNeed, string> = {
  required: "필요",
  not_required: "불필요",
  needs_review: "확인 필요",
};

export const LEVEL_LABELS: Record<LevelNeed, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
  needs_review: "확인 필요",
};

export const STATUS_LABELS: Record<BoothStatus, string> = {
  needs_setup: "설정 필요",
  needs_review: "확인 필요",
  complete: "설정 완료",
};
