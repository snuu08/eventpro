import { describe, expect, it } from "vitest";
import { buildOsmObstacleQuery } from "./osmQuery";

describe("OSM obstacle query", () => {
  it("locks building/barrier/tree/water tags and omits blanket man_made", () => {
    const ql = buildOsmObstacleQuery({ south: 37.56, west: 126.97, north: 37.57, east: 126.98 });
    expect(ql).toContain("[out:json]");
    expect(ql).toContain('nwr["building"]');
    expect(ql).toContain('nwr["barrier"]');
    expect(ql).toContain("tree|tree_row|water");
    expect(ql).not.toContain('["man_made"]');
  });
});
