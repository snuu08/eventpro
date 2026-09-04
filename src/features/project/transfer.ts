import { eventProjectSchema, type EventProjectRecord } from "../../project/schema";
import { saveProject } from "../../project/db";

export function projectToExportJson(project: EventProjectRecord): string {
  const parsed = eventProjectSchema.parse(project);
  if ("password" in parsed) {
    delete (parsed as { password?: string }).password;
  }
  return JSON.stringify(parsed, null, 2);
}

export function parseImportedProject(raw: string): EventProjectRecord {
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch (error) {
    throw new Error("JSON 형식이 아닙니다.", { cause: error });
  }
  const parsed = eventProjectSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("지원하지 않는 파일이거나 필수 값이 빠졌습니다.");
  }
  return parsed.data;
}

export async function importAsCopy(source: EventProjectRecord): Promise<EventProjectRecord> {
  const copy: EventProjectRecord = {
    ...source,
    id: crypto.randomUUID(),
    title: `${source.title} 복사본`,
    updatedAt: new Date().toISOString(),
    candidates: source.candidates.map((item) => ({ ...item })),
    booths: source.booths.map((item) => ({ ...item })),
    obstacles: source.obstacles?.map((item) => ({ ...item })),
  };
  await saveProject(copy);
  return copy;
}

export function exportContainsSecrets(json: string): boolean {
  return json.includes("ANTHROPIC") || json.includes("BEGIN PRIVATE");
}
