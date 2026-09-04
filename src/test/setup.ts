import "fake-indexeddb/auto";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

vi.mock("react-konva", () => ({
  Stage: ({ children }: { children?: unknown }) => children,
  Layer: ({ children }: { children?: unknown }) => children,
  Rect: () => null,
  Line: () => null,
  Circle: () => null,
  Group: ({ children }: { children?: unknown }) => children,
  Text: () => null,
}));

afterEach(() => {
  cleanup();
});
