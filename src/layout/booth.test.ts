import { describe, expect, it } from "vitest";
import { DEFAULT_BOOTH_SIZE, boothFacing, flipBoothOrientation, setBoothOrientation } from "./booth";
import type { ProgramBooth } from "../types/eventProject";

const booth: ProgramBooth = {
  id: "b1",
  name: "프로그램 1",
  description: "",
  category: "",
  dwellMinutes: 8,
  capacity: 10,
  popularity: 3,
  requirements: [],
  size: { ...DEFAULT_BOOTH_SIZE },
  rotation: 0,
};

describe("booth orientation", () => {
  it("swaps width and height between landscape and portrait", () => {
    const flipped = flipBoothOrientation(booth);
    expect(flipped.size).toEqual({ width: DEFAULT_BOOTH_SIZE.height, height: DEFAULT_BOOTH_SIZE.width });
    expect(flipped.rotation).toBe(90);
    expect(boothFacing(flipped)).toBe("portrait");
    const back = flipBoothOrientation(flipped);
    expect(back.size).toEqual(DEFAULT_BOOTH_SIZE);
    expect(back.rotation).toBe(0);
  });

  it("sets landscape or portrait without toggling past the target", () => {
    const portrait = setBoothOrientation(booth, "portrait");
    expect(boothFacing(portrait)).toBe("portrait");
    expect(setBoothOrientation(portrait, "portrait").size).toEqual(portrait.size);
    const landscape = setBoothOrientation(portrait, "landscape");
    expect(boothFacing(landscape)).toBe("landscape");
    expect(landscape.size).toEqual(DEFAULT_BOOTH_SIZE);
  });

  it("turns a square booth into a visible landscape or portrait", () => {
    const square = { ...booth, size: { width: 0.06, height: 0.06 } };
    const portrait = setBoothOrientation(square, "portrait");
    expect(portrait.size).toEqual({ width: DEFAULT_BOOTH_SIZE.height, height: DEFAULT_BOOTH_SIZE.width });
    expect(boothFacing(portrait)).toBe("portrait");
    const landscape = setBoothOrientation(square, "landscape");
    expect(landscape.size).toEqual(DEFAULT_BOOTH_SIZE);
    expect(boothFacing(landscape)).toBe("landscape");
  });
});
