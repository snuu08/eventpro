import type { GeoPoint, MapOverlay, RectBounds } from "../maps/types";

export type PortalKind = "entrance" | "exit" | "both";

export type FacilityKind =
  | "stage"
  | "restroom"
  | "power"
  | "hq"
  | "info"
  | "other"
  | "special";

export interface Portal {
  id: string;
  kind: PortalKind;
  position: GeoPoint;
}

export interface Facility {
  id: string;
  kind: FacilityKind;
  position: GeoPoint;
  label?: string;
  description?: string;
  sizeM?: { width: number; height: number };
  needsPower?: boolean;
}

export interface NoInstallZone {
  id: string;
  sw: GeoPoint;
  ne: GeoPoint;
}

export interface VenueConditions {
  portals: Portal[];
  facilities: Facility[];
  zones: NoInstallZone[];
}

export const EMPTY_CONDITIONS: VenueConditions = {
  portals: [],
  facilities: [],
  zones: [],
};

export const PORTAL_LABELS: Record<PortalKind, string> = {
  entrance: "입구",
  exit: "출구",
  both: "입·출구 겸용",
};

export const FACILITY_LABELS: Record<FacilityKind, string> = {
  stage: "무대",
  restroom: "화장실",
  power: "전력 위치",
  hq: "운영본부",
  info: "안내소",
  other: "기타",
  special: "특별 시설",
};

export function createConditionId(): string {
  return crypto.randomUUID();
}

export function toRectBounds(a: GeoPoint, b: GeoPoint): RectBounds {
  return {
    sw: {
      lat: Math.min(a.lat, b.lat),
      lng: Math.min(a.lng, b.lng),
    },
    ne: {
      lat: Math.max(a.lat, b.lat),
      lng: Math.max(a.lng, b.lng),
    },
  };
}

export function isTinyRect(bounds: RectBounds): boolean {
  return (
    Math.abs(bounds.ne.lat - bounds.sw.lat) < 1e-7 &&
    Math.abs(bounds.ne.lng - bounds.sw.lng) < 1e-7
  );
}

export function conditionsToOverlays(conditions: VenueConditions): MapOverlay[] {
  const markers: MapOverlay[] = [];

  conditions.portals.forEach((portal, index) => {
    markers.push({
      id: portal.id,
      type: "marker",
      position: portal.position,
      label: `${PORTAL_LABELS[portal.kind]} ${index + 1}`,
    });
  });

  const counts = new Map<FacilityKind, number>();
  for (const facility of conditions.facilities) {
    const next = (counts.get(facility.kind) ?? 0) + 1;
    counts.set(facility.kind, next);
    const base = facility.label?.trim() || FACILITY_LABELS[facility.kind];
    markers.push({
      id: facility.id,
      type: "marker",
      position: facility.position,
      label: facility.kind === "special" ? base : `${base} ${next}`,
    });
  }

  for (const zone of conditions.zones) {
    markers.push({
      id: zone.id,
      type: "rect",
      sw: zone.sw,
      ne: zone.ne,
    });
  }

  return markers;
}

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

function isPortalKind(value: unknown): value is PortalKind {
  return value === "entrance" || value === "exit" || value === "both";
}

function isFacilityKind(value: unknown): value is FacilityKind {
  return (
    value === "stage" ||
    value === "restroom" ||
    value === "power" ||
    value === "hq" ||
    value === "info" ||
    value === "other" ||
    value === "special"
  );
}

export function parseConditions(value: unknown): VenueConditions {
  if (!value || typeof value !== "object") {
    return { ...EMPTY_CONDITIONS };
  }

  const raw = value as Partial<VenueConditions>;
  const portals: Portal[] = [];
  for (const item of raw.portals ?? []) {
    const position = parsePoint(item?.position);
    if (!item?.id || !isPortalKind(item.kind) || !position) {
      continue;
    }
    portals.push({ id: String(item.id), kind: item.kind, position });
  }

  const facilities: Facility[] = [];
  for (const item of raw.facilities ?? []) {
    const position = parsePoint(item?.position);
    if (!item?.id || !isFacilityKind(item.kind) || !position) {
      continue;
    }
    const width = Number(item.sizeM?.width);
    const height = Number(item.sizeM?.height);
    facilities.push({
      id: String(item.id),
      kind: item.kind,
      position,
      label: item.label?.trim() || undefined,
      description: item.description?.trim() || undefined,
      sizeM:
        Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0
          ? { width, height }
          : undefined,
      needsPower: item.needsPower ? true : undefined,
    });
  }

  const zones: NoInstallZone[] = [];
  for (const item of raw.zones ?? []) {
    const sw = parsePoint(item?.sw);
    const ne = parsePoint(item?.ne);
    if (!item?.id || !sw || !ne) {
      continue;
    }
    zones.push({ id: String(item.id), sw, ne });
  }

  return { portals, facilities, zones };
}
