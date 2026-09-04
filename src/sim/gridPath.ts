import type { NormalizedPoint, VenueObstacle } from "../types/eventProject";
import { pointInPolygon } from "../layout/polygon";
import { hitsObstacle } from "../geo/obstacleHit";

const COLS = 40;
const ROWS = 40;

export type Grid = {
  walkable: boolean[][];
  cols: number;
  rows: number;
};

export function worldToCell(point: NormalizedPoint): { c: number; r: number } {
  return {
    c: Math.min(COLS - 1, Math.max(0, Math.floor(point.x * COLS))),
    r: Math.min(ROWS - 1, Math.max(0, Math.floor(point.y * ROWS))),
  };
}

export function cellToWorld(c: number, r: number): NormalizedPoint {
  return { x: (c + 0.5) / COLS, y: (r + 0.5) / ROWS };
}

export function buildWalkGrid(
  polygon: NormalizedPoint[],
  blocked: NormalizedPoint[],
  blockRadius: number,
  obstacles?: VenueObstacle[],
): Grid {
  const walkable: boolean[][] = [];
  for (let r = 0; r < ROWS; r += 1) {
    walkable[r] = [];
    for (let c = 0; c < COLS; c += 1) {
      const point = cellToWorld(c, r);
      const inside = polygon.length < 3 || pointInPolygon(point, polygon);
      const hit = blocked.some((item) => Math.hypot(item.x - point.x, item.y - point.y) < blockRadius);
      walkable[r][c] = inside && !hit && !hitsObstacle(point, obstacles);
    }
  }
  return { walkable, cols: COLS, rows: ROWS };
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

function nearestWalkable(grid: Grid, point: NormalizedPoint): { c: number; r: number } {
  const start = worldToCell(point);
  if (grid.walkable[start.r][start.c]) {
    return start;
  }
  let best = start;
  let bestDist = Infinity;
  for (let r = 0; r < grid.rows; r += 1) {
    for (let c = 0; c < grid.cols; c += 1) {
      if (!grid.walkable[r][c]) {
        continue;
      }
      const dist = Math.hypot(c - start.c, r - start.r);
      if (dist < bestDist) {
        bestDist = dist;
        best = { c, r };
      }
    }
  }
  return best;
}

export function findPath(grid: Grid, from: NormalizedPoint, to: NormalizedPoint): NormalizedPoint[] {
  const start = nearestWalkable(grid, from);
  const goal = nearestWalkable(grid, to);
  const key = (c: number, r: number) => `${c},${r}`;
  const open: Array<{ c: number; r: number; g: number; f: number }> = [
    { c: start.c, r: start.r, g: 0, f: 0 },
  ];
  const came = new Map<string, { c: number; r: number }>();
  const gScore = new Map<string, number>([[key(start.c, start.r), 0]]);

  while (open.length) {
    open.sort((a, b) => a.f - b.f);
    const current = open.shift()!;
    if (current.c === goal.c && current.r === goal.r) {
      const path: NormalizedPoint[] = [cellToWorld(current.c, current.r)];
      let node = came.get(key(current.c, current.r));
      while (node) {
        path.push(cellToWorld(node.c, node.r));
        node = came.get(key(node.c, node.r));
      }
      return path.reverse();
    }
    for (const [dc, dr] of DIRS) {
      const nc = current.c + dc;
      const nr = current.r + dr;
      if (nc < 0 || nr < 0 || nc >= grid.cols || nr >= grid.rows || !grid.walkable[nr][nc]) {
        continue;
      }
      const step = dc !== 0 && dr !== 0 ? 1.4 : 1;
      const tentative = (gScore.get(key(current.c, current.r)) ?? 0) + step;
      const nk = key(nc, nr);
      if (tentative < (gScore.get(nk) ?? Infinity)) {
        came.set(nk, current);
        gScore.set(nk, tentative);
        const h = Math.hypot(nc - goal.c, nr - goal.r);
        open.push({ c: nc, r: nr, g: tentative, f: tentative + h });
      }
    }
  }
  return [to];
}
