import { describe, expect, it } from "vitest";
import { createMapProjection, geoBbox, latLngToWorld, polygonToGeo, worldToLatLng } from "./projection";

describe("mercator projection", () => {
  it("maps the equator and prime meridian to world center", () => {
    const world = latLngToWorld(0, 0);
    expect(world.x).toBeCloseTo(0.5, 6);
    expect(world.y).toBeCloseTo(0.5, 6);
    const back = worldToLatLng(world.x, world.y);
    expect(back.lat).toBeCloseTo(0, 5);
    expect(back.lng).toBeCloseTo(0, 5);
  });

  it("round-trips a locked viewport point", () => {
    const map = {
      center: { lat: 37.5665, lng: 126.978 },
      zoom: 17,
      heading: 0,
      baseViewport: { width: 1280, height: 720 },
    };
    const proj = createMapProjection(map);
    const geo = proj.normalizedToLatLng({ x: 0.25, y: 0.4 });
    const again = proj.latLngToNormalized(geo.lat, geo.lng);
    expect(again.x).toBeCloseTo(0.25, 5);
    expect(again.y).toBeCloseTo(0.4, 5);
  });

  it("builds a bbox from the venue polygon", () => {
    const map = {
      center: { lat: 37.5665, lng: 126.978 },
      zoom: 18,
      baseViewport: { width: 800, height: 450 },
    };
    const geo = polygonToGeo(
      [
        { x: 0.2, y: 0.2 },
        { x: 0.8, y: 0.2 },
        { x: 0.8, y: 0.8 },
        { x: 0.2, y: 0.8 },
      ],
      map,
    );
    const box = geoBbox(geo);
    expect(box).not.toBeNull();
    expect(box!.north).toBeGreaterThan(box!.south);
    expect(box!.east).toBeGreaterThan(box!.west);
  });
});
