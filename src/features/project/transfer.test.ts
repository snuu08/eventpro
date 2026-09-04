import { describe, expect, it } from "vitest";
import { EVENT_PROJECT_SCHEMA_VERSION } from "../../types/eventProject";
import { projectToExportJson, parseImportedProject } from "./transfer";
import type { EventProjectRecord } from "../../project/schema";

const sample: EventProjectRecord = {
  id: "p1",
  title: "테스트",
  passwordSalt: "s",
  passwordHash: "h",
  expectedVisitors: 100,
  boothCount: 1,
  purpose: "market",
  venuePolygon: [{ x: 0.1, y: 0.1 }, { x: 0.9, y: 0.1 }, { x: 0.9, y: 0.9 }],
  accessPoints: [],
  booths: [
    {
      id: "b1",
      name: "프로그램 1",
      description: "",
      category: "",
      dwellMinutes: 8,
      capacity: 10,
      popularity: 3,
      requirements: [],
    },
  ],
  optionalFacilities: [],
  candidates: [],
  schemaVersion: EVENT_PROJECT_SCHEMA_VERSION,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("project transfer", () => {
  it("round-trips JSON without the password plaintext", () => {
    const json = projectToExportJson(sample);
    expect(json).not.toContain("secret");
    expect(parseImportedProject(json).id).toBe("p1");
  });

  it("rejects invalid schema", () => {
    expect(() => parseImportedProject("{}")).toThrow();
  });
});
