import { describe, expect, it } from "vitest";
import { coverSquareSide, letterbox } from "./letterbox";

describe("letterbox", () => {
  it("keeps 16:9 inside a wide window", () => {
    const box = letterbox({ width: 1920, height: 800 }, 16 / 9);
    expect(box.width / box.height).toBeCloseTo(16 / 9, 5);
    expect(box.height).toBe(800);
  });
});

describe("coverSquareSide", () => {
  it("covers a 16:9 window at any rotation", () => {
    const frame = letterbox({ width: 1920, height: 800 }, 16 / 9);
    const side = coverSquareSide(frame.width, frame.height);
    expect(side).toBeCloseTo(Math.hypot(frame.width, frame.height), 5);
    expect(side).toBeGreaterThanOrEqual(frame.width);
    expect(side).toBeGreaterThanOrEqual(frame.height);
  });

  it("keeps the letterbox window the same at 0 and 90 degrees", () => {
    const at0 = letterbox({ width: 1920, height: 800 }, 16 / 9);
    const at90 = letterbox({ width: 1920, height: 800 }, 16 / 9);
    expect(at90.width).toBeCloseTo(at0.width, 5);
    expect(at90.height).toBeCloseTo(at0.height, 5);
  });
});
