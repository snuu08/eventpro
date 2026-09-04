import { distance, pointInPolygon } from "../layout/polygon";
import type { NormalizedPoint, VenueObstacle } from "../types/eventProject";

const POINT_RADIUS: Record<VenueObstacle["type"], number> = {
  tree: 0.012,
  barrier: 0.01,
  fountain: 0.014,
  building: 0.01,
  water: 0.01,
  construction: 0.012,
};

function minDistanceToRing(point: NormalizedPoint, ring: NormalizedPoint[]): number {
  let best = Infinity;
  for (let i = 0; i < ring.length; i += 1) {
    const a = ring[i];
    const b = ring[(i + 1) % ring.length];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy || 1;
    const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / len2));
    best = Math.min(best, Math.hypot(point.x - (a.x + t * dx), point.y - (a.y + t * dy)));
  }
  return best;
}

export function activeObstacles(obstacles: VenueObstacle[] | undefined): VenueObstacle[] {
  return (obstacles ?? []).filter((item) => item.confirmed && item.source === "osm");
}

export function hitsObstacle(point: NormalizedPoint, obstacles: VenueObstacle[] | undefined, extra = 0): boolean {
  for (const item of activeObstacles(obstacles)) {
    const geom = item.normalizedGeometry;
    if (geom.length >= 3) {
      if (pointInPolygon(point, geom)) {
        return true;
      }
      if (minDistanceToRing(point, geom) < 0.008 + extra) {
        return true;
      }
      continue;
    }
    if (geom.length >= 1 && distance(point, geom[0]) < POINT_RADIUS[item.type] + extra) {
      return true;
    }
  }
  return false;
}
