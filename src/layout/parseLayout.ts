import type { GeoPoint, RectBounds } from "../maps/types";
import { EMPTY_LAYOUT, LAYOUT_STYLES, type BoothPlacement, type LayoutState, type LayoutStyle } from "./types";

function parsePoint(value: unknown): GeoPoint | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as { lat?: unknown; lng?: unknown };
  const lat = Number(raw.lat);
  const lng = Number(raw.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }
  return { lat, lng };
}

function parseBounds(value: unknown): RectBounds | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const raw = value as RectBounds;
  const sw = parsePoint(raw.sw);
  const ne = parsePoint(raw.ne);
  if (!sw || !ne) {
    return null;
  }
  return { sw, ne };
}

function parseStyle(value: unknown): LayoutStyle {
  return LAYOUT_STYLES.includes(value as LayoutStyle) ? (value as LayoutStyle) : "grid";
}

export function parseLayout(value: unknown): LayoutState {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_LAYOUT, placements: [] };
  }

  const raw = value as Partial<LayoutState>;
  const placements: BoothPlacement[] = [];
  for (const item of raw.placements ?? []) {
    const center = parsePoint(item?.center);
    const sw = parsePoint(item?.sw);
    const ne = parsePoint(item?.ne);
    if (!item?.boothId || !item?.code || !center || !sw || !ne) {
      continue;
    }
    placements.push({
      boothId: String(item.boothId),
      code: String(item.code),
      center,
      sw,
      ne,
    });
  }

  const recStyle = raw.recommendation?.style;
  const recReason = raw.recommendation?.reason;

  return {
    style: parseStyle(raw.style),
    workBounds: parseBounds(raw.workBounds),
    placements,
    recommendation:
      recStyle && LAYOUT_STYLES.includes(recStyle) && typeof recReason === "string"
        ? { style: recStyle, reason: recReason }
        : null,
  };
}
