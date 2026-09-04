import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const srcRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("places search env split", () => {
  it("does not read GOOGLE_PLACES_API_KEY from browser src", () => {
    const files = ["features/map/PlaceControls.tsx", "features/map/usePlaceSession.ts", "features/map/searchPlaces.ts", "maps/GoogleMapAdapter.ts", "maps/createMapAdapter.ts"];
    for (const file of files) {
      const text = readFileSync(join(srcRoot, file), "utf8");
      expect(text).not.toMatch(/GOOGLE_PLACES_API_KEY/);
      expect(text).not.toMatch(/maps\.googleapis\.com\/maps\/api\/place/);
    }
  });
});
