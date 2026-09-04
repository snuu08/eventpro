import { describe, expect, it } from "vitest";
import { canvasPixelRatio, toNormalized, toScreen, type FrameRect } from "./coords";

describe("normalized coordinates", () => {
  it("keeps stored points when the frame size changes", () => {
    const small: FrameRect = { x: 0, y: 0, width: 200, height: 100 };
    const large: FrameRect = { x: 0, y: 0, width: 800, height: 400 };
    const data = { x: 0.25, y: 0.5 };
    const screen = toScreen(data, small);
    expect(toNormalized(screen, small)).toEqual(data);
    expect(toNormalized(toScreen(data, large), large)).toEqual(data);
    expect(data).toEqual({ x: 0.25, y: 0.5 });
  });

  it("uses a device pixel ratio of at least 1", () => {
    expect(canvasPixelRatio(2)).toBe(2);
    expect(canvasPixelRatio(0)).toBe(1);
  });
});
