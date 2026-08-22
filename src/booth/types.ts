export const BOOTH_TYPES = [
  "experience",
  "promotion",
  "consultation",
  "sales",
  "exhibition",
  "food",
  "event",
  "other",
] as const;

export type BoothType = (typeof BOOTH_TYPES)[number];

export const TERNARY_NEEDS = ["required", "not_required", "needs_review"] as const;
export type TernaryNeed = (typeof TERNARY_NEEDS)[number];

export const LEVEL_NEEDS = ["low", "medium", "high", "needs_review"] as const;
export type LevelNeed = (typeof LEVEL_NEEDS)[number];

export type FieldSource = "ai" | "user";

export interface Sourced<T> {
  value: T;
  source: FieldSource;
}

export interface StaffValue {
  count: number | null;
  needsReview: boolean;
}

export interface BoothAnalysis {
  boothName: Sourced<string>;
  type: Sourced<BoothType>;
  power: Sourced<TernaryNeed>;
  electricalEquipment: Sourced<string[]>;
  internet: Sourced<TernaryNeed>;
  water: Sourced<TernaryNeed>;
  drainage: Sourced<TernaryNeed>;
  waitingArea: Sourced<TernaryNeed>;
  storage: Sourced<TernaryNeed>;
  waste: Sourced<LevelNeed>;
  noise: Sourced<LevelNeed>;
  staff: Sourced<StaffValue>;
  followUpQuestion: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Booth {
  id: string;
  code: string;
  description: string;
  messages: ChatMessage[];
  analysis: BoothAnalysis | null;
  confirmed: boolean;
}

export type BoothStatus = "needs_setup" | "needs_review" | "complete";

export interface ReadinessIssue {
  boothId: string;
  code: string;
  message: string;
}

export interface ReadinessSummary {
  total: number;
  complete: number;
  needsReview: number;
  needsSetup: number;
  percent: number;
  issueCount: number;
  issues: ReadinessIssue[];
}

export interface RawBoothAnalysis {
  boothName: string;
  type: string;
  power: string;
  electricalEquipment: string[];
  internet: string;
  water: string;
  drainage: string;
  waitingArea: string;
  storage: string;
  waste: string;
  noise: string;
  staffCount: number | null;
  staffNeedsReview: boolean;
  followUpQuestion: string | null;
}
