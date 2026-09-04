import { EVENT_PROJECT_SCHEMA_VERSION, type EventPurpose, type ProgramBooth } from "../../types/eventProject";
import type { EventProjectRecord } from "../../project/schema";
import { BOOTHS_MAX, BOOTHS_MIN, PASSWORD_MIN_LENGTH, VISITORS_MAX, VISITORS_MIN } from "../../shared/limits";

export const PURPOSE_CARDS: Array<{ id: EventPurpose; label: string }> = [
  { id: "experience", label: "체험 중심" },
  { id: "promotion", label: "홍보·정책 안내" },
  { id: "market", label: "플리마켓·판매" },
  { id: "performance", label: "공연·무대" },
  { id: "networking", label: "네트워킹" },
  { id: "custom", label: "직접 입력" },
];

export type CreateInput = {
  title: string;
  password: string;
  expectedVisitors: number;
  boothCount: number;
  purpose: EventPurpose | "";
  customPurpose: string;
};

export function emptyBooths(count: number): ProgramBooth[] {
  return Array.from({ length: count }, (_, index) => ({
    id: crypto.randomUUID(),
    name: `프로그램 ${index + 1}`,
    description: "",
    category: "",
    dwellMinutes: 8,
    capacity: 10,
    popularity: 3 as const,
    requirements: [],
    size: { width: 0.08, height: 0.05 },
    rotation: 0,
  }));
}

export function validateCreateInput(input: CreateInput): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.title.trim()) {
    errors.title = "행사 제목을 입력해 주세요.";
  }
  if (input.password.length < PASSWORD_MIN_LENGTH) {
    errors.password = `편집 비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상이어야 합니다.`;
  }
  if (!Number.isFinite(input.expectedVisitors) || input.expectedVisitors < VISITORS_MIN || input.expectedVisitors > VISITORS_MAX) {
    errors.expectedVisitors = `예상 참여 인원은 ${VISITORS_MIN}~${VISITORS_MAX}명으로 입력해 주세요.`;
  }
  if (!Number.isInteger(input.boothCount) || input.boothCount < BOOTHS_MIN || input.boothCount > BOOTHS_MAX) {
    errors.boothCount = `부스 개수는 ${BOOTHS_MIN}~${BOOTHS_MAX}개로 입력해 주세요.`;
  }
  if (!input.purpose) {
    errors.purpose = "행사 목적을 선택해 주세요.";
  }
  if (input.purpose === "custom" && !input.customPurpose.trim()) {
    errors.customPurpose = "직접 입력 목적을 적어 주세요.";
  }
  return errors;
}

export function buildNewProject(
  input: CreateInput,
  secrets: { salt: string; hash: string },
): EventProjectRecord {
  const booths = emptyBooths(input.boothCount);
  return {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    passwordSalt: secrets.salt,
    passwordHash: secrets.hash,
    expectedVisitors: input.expectedVisitors,
    boothCount: input.boothCount,
    purpose: input.purpose as EventPurpose,
    customPurpose: input.purpose === "custom" ? input.customPurpose.trim() : undefined,
    venuePolygon: [],
    accessPoints: [],
    booths,
    optionalFacilities: [],
    candidates: [],
    schemaVersion: EVENT_PROJECT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
}
