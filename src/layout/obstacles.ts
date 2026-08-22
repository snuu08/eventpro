import type { GeoPoint, RectBounds } from "../maps/types";
import type { Facility, VenueConditions } from "../types/venue";
import { PORTAL_BUFFER_M } from "./types";
import { squareAround } from "./geo";

export interface NamedRect {
  id: string;
  kind: "portal" | "facility" | "zone";
  bounds: RectBounds;
}

function facilitySizeM(facility: Facility): number {
  if (facility.sizeM) {
    return Math.max(facility.sizeM.width, facility.sizeM.height);
  }
  if (facility.kind === "stage") {
    return 10;
  }
  if (facility.kind === "hq") {
    return 6;
  }
  if (facility.kind === "power") {
    return 3;
  }
  return 5;
}

export function buildObstacles(conditions: VenueConditions): NamedRect[] {
  const items: NamedRect[] = [];

  for (const portal of conditions.portals) {
    items.push({
      id: portal.id,
      kind: "portal",
      bounds: squareAround(portal.position, PORTAL_BUFFER_M),
    });
  }

  for (const facility of conditions.facilities) {
    items.push({
      id: facility.id,
      kind: "facility",
      bounds: squareAround(facility.position, facilitySizeM(facility)),
    });
  }

  for (const zone of conditions.zones) {
    items.push({
      id: zone.id,
      kind: "zone",
      bounds: { sw: zone.sw, ne: zone.ne },
    });
  }

  return items;
}

export function powerPoints(conditions: VenueConditions): GeoPoint[] {
  return conditions.facilities
    .filter((item) => item.kind === "power")
    .map((item) => item.position);
}
