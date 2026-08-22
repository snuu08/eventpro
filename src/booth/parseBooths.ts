import { generateBooths } from "./generateBooths";
import { parseRawAnalysis, toBoothAnalysis } from "./parseAnalysis";
import type { Booth, BoothAnalysis, ChatMessage, FieldSource, Sourced } from "./types";

function parseMessages(value: unknown): ChatMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const messages: ChatMessage[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const role = (item as ChatMessage).role;
    const content = (item as ChatMessage).content;
    if ((role === "user" || role === "assistant") && typeof content === "string" && content.trim()) {
      messages.push({ role, content });
    }
  }
  return messages;
}

function parseSourced<T>(value: unknown, fallback: T): Sourced<T> {
  if (!value || typeof value !== "object") {
    return { value: fallback, source: "ai" };
  }
  const raw = value as Sourced<T>;
  const source: FieldSource = raw.source === "user" ? "user" : "ai";
  return { value: (raw.value as T) ?? fallback, source };
}

function parseSavedAnalysis(value: unknown): BoothAnalysis | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as BoothAnalysis;
  const normalized = parseRawAnalysis({
    boothName: raw.boothName?.value,
    type: raw.type?.value,
    power: raw.power?.value,
    electricalEquipment: raw.electricalEquipment?.value,
    internet: raw.internet?.value,
    water: raw.water?.value,
    drainage: raw.drainage?.value,
    waitingArea: raw.waitingArea?.value,
    storage: raw.storage?.value,
    waste: raw.waste?.value,
    noise: raw.noise?.value,
    staffCount: raw.staff?.value?.count ?? null,
    staffNeedsReview: raw.staff?.value?.needsReview ?? true,
    followUpQuestion: raw.followUpQuestion,
  });
  if (!normalized) {
    return null;
  }
  const base = toBoothAnalysis(normalized);
  return {
    boothName: parseSourced(raw.boothName, base.boothName.value),
    type: parseSourced(raw.type, base.type.value),
    power: parseSourced(raw.power, base.power.value),
    electricalEquipment: parseSourced(raw.electricalEquipment, base.electricalEquipment.value),
    internet: parseSourced(raw.internet, base.internet.value),
    water: parseSourced(raw.water, base.water.value),
    drainage: parseSourced(raw.drainage, base.drainage.value),
    waitingArea: parseSourced(raw.waitingArea, base.waitingArea.value),
    storage: parseSourced(raw.storage, base.storage.value),
    waste: parseSourced(raw.waste, base.waste.value),
    noise: parseSourced(raw.noise, base.noise.value),
    staff: parseSourced(raw.staff, base.staff.value),
    followUpQuestion: typeof raw.followUpQuestion === "string" ? raw.followUpQuestion : base.followUpQuestion,
  };
}

export function parseBooths(value: unknown, boothCount: number): Booth[] {
  if (!Array.isArray(value) || value.length === 0) {
    return generateBooths(boothCount);
  }

  const booths: Booth[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const raw = item as Partial<Booth>;
    const code = typeof raw.code === "string" && raw.code.trim() ? raw.code : raw.id;
    if (typeof code !== "string" || !code.trim()) {
      continue;
    }
    booths.push({
      id: typeof raw.id === "string" && raw.id.trim() ? raw.id : code,
      code,
      description: typeof raw.description === "string" ? raw.description : "",
      messages: parseMessages(raw.messages),
      analysis: parseSavedAnalysis(raw.analysis),
      confirmed: Boolean(raw.confirmed),
    });
  }

  return booths.length > 0 ? booths : generateBooths(boothCount);
}
