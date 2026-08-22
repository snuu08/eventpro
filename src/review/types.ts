import type { LayoutStyle } from "../layout/types";

export const REVIEW_TOPICS = [
  "power",
  "waiting",
  "noise",
  "water",
  "readiness",
  "type",
  "other",
] as const;

export type ReviewTopic = (typeof REVIEW_TOPICS)[number];

export interface ReviewFinding {
  topic: ReviewTopic;
  message: string;
}

export interface ReviewAlternative {
  style: LayoutStyle;
  currentProblem: string;
  reason: string;
}

export interface ReviewComparisonRow {
  aspect: string;
  current: string;
  alternative: string;
}

export interface OpsReview {
  findings: ReviewFinding[];
  alternative: ReviewAlternative | null;
  comparison: ReviewComparisonRow[] | null;
  alternativeApplied: boolean;
  fromStyle: LayoutStyle;
}

export const REVIEW_TOPIC_LABELS: Record<ReviewTopic, string> = {
  power: "전력",
  waiting: "대기",
  noise: "소음",
  water: "급수",
  readiness: "준비상태",
  type: "유형",
  other: "운영",
};

export const EMPTY_REVIEW: OpsReview = {
  findings: [],
  alternative: null,
  comparison: null,
  alternativeApplied: false,
  fromStyle: "grid",
};
