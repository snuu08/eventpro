import Dexie, { type Table } from "dexie";
import { eventProjectSchema, type EventProjectRecord } from "./schema";

export type ProjectImage = { id: string; blob: Blob };

class EventLabDB extends Dexie {
  projects!: Table<EventProjectRecord, string>;
  images!: Table<ProjectImage, string>;

  constructor() {
    super("event-lab");
    this.version(1).stores({
      projects: "id, updatedAt, title",
      images: "id",
    });
  }
}

export const db = new EventLabDB();

export async function saveProject(project: EventProjectRecord): Promise<void> {
  const parsed = eventProjectSchema.parse(project);
  await db.projects.put(parsed);
}

export async function loadProject(id: string): Promise<EventProjectRecord | undefined> {
  const row = await db.projects.get(id);
  if (!row) {
    return undefined;
  }
  return eventProjectSchema.parse(row);
}

export async function saveImage(id: string, blob: Blob): Promise<void> {
  await db.images.put({ id, blob });
}

export async function loadImage(id: string): Promise<Blob | undefined> {
  const row = await db.images.get(id);
  return row?.blob;
}

export async function listProjects(): Promise<Array<{ id: string; title: string; updatedAt: string }>> {
  const rows = await db.projects.orderBy("updatedAt").reverse().toArray();
  return rows.map((row) => ({ id: row.id, title: row.title, updatedAt: row.updatedAt }));
}
