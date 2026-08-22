import type { Booth } from "./types";

export function boothCode(index: number): string {
  return `A${String(index).padStart(2, "0")}`;
}

export function createEmptyBooth(index: number): Booth {
  const code = boothCode(index);
  return {
    id: code,
    code,
    description: "",
    messages: [],
    analysis: null,
    confirmed: false,
  };
}

export function generateBooths(count: number): Booth[] {
  const safe = Number.isInteger(count) && count > 0 ? count : 0;
  return Array.from({ length: safe }, (_, index) => createEmptyBooth(index + 1));
}
