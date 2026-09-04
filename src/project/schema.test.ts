import { describe, expect, it } from "vitest";
import { EVENT_PROJECT_SCHEMA_VERSION } from "../types/eventProject";
import { eventProjectSchema } from "./schema";

describe("eventProjectSchema", () => {
  it("rejects coordinates outside 0–1", () => {
    const result = eventProjectSchema.safeParse({
      id: "p1",
      title: "테스트",
      passwordSalt: "s",
      passwordHash: "h",
      expectedVisitors: 100,
      boothCount: 1,
      purpose: "market",
      venuePolygon: [{ x: 1.2, y: 0.1 }],
      accessPoints: [],
      booths: [],
      optionalFacilities: [],
      candidates: [],
      schemaVersion: EVENT_PROJECT_SCHEMA_VERSION,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(false);
  });

  it("accepts projects without obstacles for schemaVersion 1", () => {
    const result = eventProjectSchema.safeParse({
      id: "p1",
      title: "테스트",
      passwordSalt: "s",
      passwordHash: "h",
      expectedVisitors: 100,
      boothCount: 0,
      purpose: "market",
      venuePolygon: [],
      accessPoints: [],
      booths: [],
      optionalFacilities: [],
      candidates: [],
      schemaVersion: EVENT_PROJECT_SCHEMA_VERSION,
      updatedAt: "2026-01-01T00:00:00.000Z",
    });
    expect(result.success).toBe(true);
  });
});
