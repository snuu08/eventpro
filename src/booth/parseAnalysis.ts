import type {
  BoothAnalysis,
  BoothType,
  LevelNeed,
  RawBoothAnalysis,
  Sourced,
  StaffValue,
  TernaryNeed,
} from "./types";
import { BOOTH_TYPES, LEVEL_NEEDS, TERNARY_NEEDS } from "./types";

export const BOOTH_ANALYSIS_JSON_SCHEMA = {
  name: "booth_operating_conditions",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "boothName",
      "type",
      "power",
      "electricalEquipment",
      "internet",
      "water",
      "drainage",
      "waitingArea",
      "storage",
      "waste",
      "noise",
      "staffCount",
      "staffNeedsReview",
      "followUpQuestion",
    ],
    properties: {
      boothName: { type: "string" },
      type: { type: "string", enum: [...BOOTH_TYPES] },
      power: { type: "string", enum: [...TERNARY_NEEDS] },
      electricalEquipment: {
        type: "array",
        items: { type: "string" },
      },
      internet: { type: "string", enum: [...TERNARY_NEEDS] },
      water: { type: "string", enum: [...TERNARY_NEEDS] },
      drainage: { type: "string", enum: [...TERNARY_NEEDS] },
      waitingArea: { type: "string", enum: [...TERNARY_NEEDS] },
      storage: { type: "string", enum: [...TERNARY_NEEDS] },
      waste: { type: "string", enum: [...LEVEL_NEEDS] },
      noise: { type: "string", enum: [...LEVEL_NEEDS] },
      staffCount: { type: ["number", "null"] },
      staffNeedsReview: { type: "boolean" },
      followUpQuestion: { type: ["string", "null"] },
    },
  },
} as const;

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function sourced<T>(value: T): Sourced<T> {
  return { value, source: "ai" };
}

function parseBoothType(value: unknown): BoothType {
  return BOOTH_TYPES.includes(value as BoothType) ? (value as BoothType) : "other";
}

function parseTernary(value: unknown): TernaryNeed {
  return TERNARY_NEEDS.includes(value as TernaryNeed)
    ? (value as TernaryNeed)
    : "needs_review";
}

function parseLevel(value: unknown): LevelNeed {
  return LEVEL_NEEDS.includes(value as LevelNeed)
    ? (value as LevelNeed)
    : "needs_review";
}

function parseEquipment(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function parseStaff(raw: { staffCount?: unknown; staffNeedsReview?: unknown }): StaffValue {
  const count = typeof raw.staffCount === "number" && Number.isFinite(raw.staffCount)
    ? Math.max(0, Math.round(raw.staffCount))
    : null;
  const needsReview = raw.staffNeedsReview === true || count === null;
  return { count: needsReview && raw.staffNeedsReview !== false ? count : count, needsReview };
}

function parseQuestion(value: unknown): string | null {
  const text = asString(value).trim();
  return text ? text.slice(0, 200) : null;
}

export function parseRawAnalysis(input: unknown): RawBoothAnalysis | null {
  if (!input || typeof input !== "object") {
    return null;
  }
  const raw = input as Record<string, unknown>;
  const name = asString(raw.boothName).trim().slice(0, 80);
  if (!name) {
    return null;
  }

  const staff = parseStaff(raw);
  return {
    boothName: name,
    type: parseBoothType(raw.type),
    power: parseTernary(raw.power),
    electricalEquipment: parseEquipment(raw.electricalEquipment),
    internet: parseTernary(raw.internet),
    water: parseTernary(raw.water),
    drainage: parseTernary(raw.drainage),
    waitingArea: parseTernary(raw.waitingArea),
    storage: parseTernary(raw.storage),
    waste: parseLevel(raw.waste),
    noise: parseLevel(raw.noise),
    staffCount: staff.needsReview ? staff.count : staff.count,
    staffNeedsReview: staff.needsReview,
    followUpQuestion: parseQuestion(raw.followUpQuestion),
  };
}

export function toBoothAnalysis(raw: RawBoothAnalysis): BoothAnalysis {
  return {
    boothName: sourced(raw.boothName),
    type: sourced(parseBoothType(raw.type)),
    power: sourced(parseTernary(raw.power)),
    electricalEquipment: sourced(parseEquipment(raw.electricalEquipment)),
    internet: sourced(parseTernary(raw.internet)),
    water: sourced(parseTernary(raw.water)),
    drainage: sourced(parseTernary(raw.drainage)),
    waitingArea: sourced(parseTernary(raw.waitingArea)),
    storage: sourced(parseTernary(raw.storage)),
    waste: sourced(parseLevel(raw.waste)),
    noise: sourced(parseLevel(raw.noise)),
    staff: sourced({
      count: raw.staffNeedsReview ? raw.staffCount : raw.staffCount,
      needsReview: raw.staffNeedsReview || raw.staffCount === null,
    }),
    followUpQuestion: raw.followUpQuestion,
  };
}

export function mergeAnalysis(
  previous: BoothAnalysis | null,
  incoming: BoothAnalysis,
): BoothAnalysis {
  if (!previous) {
    return incoming;
  }

  const pick = <K extends keyof Omit<BoothAnalysis, "followUpQuestion">>(
    key: K,
  ): BoothAnalysis[K] => {
    const current = previous[key];
    if (current && typeof current === "object" && "source" in current && current.source === "user") {
      return current;
    }
    return incoming[key];
  };

  return {
    boothName: pick("boothName"),
    type: pick("type"),
    power: pick("power"),
    electricalEquipment: pick("electricalEquipment"),
    internet: pick("internet"),
    water: pick("water"),
    drainage: pick("drainage"),
    waitingArea: pick("waitingArea"),
    storage: pick("storage"),
    waste: pick("waste"),
    noise: pick("noise"),
    staff: pick("staff"),
    followUpQuestion: incoming.followUpQuestion,
  };
}
