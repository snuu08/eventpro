import type { AccessPoint, EventPurpose, OptionalFacility, ProgramBooth, VenueObstacle } from "../types/eventProject";
import type { NormalizedPoint } from "../types/eventProject";
import { distance } from "../layout/polygon";
import { MAX_AGENTS, RESULT_DISCLAIMER, type SimScenario } from "./constants";
import { buildWalkGrid, findPath, type Grid } from "./gridPath";

export type Agent = {
  id: number;
  x: number;
  y: number;
  weight: number;
  visited: string[];
  state: "walk" | "queue" | "dwell" | "leave";
  targetId: string | null;
  path: NormalizedPoint[];
  waitMinutes: number;
  dwellLeft: number;
  walked: number;
  exitTime?: number;
};

export type SimInput = {
  expectedVisitors: number;
  purpose: EventPurpose;
  scenario: SimScenario;
  durationMinutes: number;
  venuePolygon: NormalizedPoint[];
  accessPoints: AccessPoint[];
  booths: ProgramBooth[];
  optionalFacilities: OptionalFacility[];
  obstacles?: VenueObstacle[];
};

export type HeatCell = { x: number; y: number; density: number };

export type SimMetrics = {
  congestionScore: number;
  heat: HeatCell[];
  averageWaitMinutes: number;
  maxWaitMinutes: number;
  averageWalkingDistance: number;
  busiestBooths: Array<{ id: string; name: string; visits: number }>;
  bottlenecks: Array<{ x: number; y: number; density: number }>;
  averageExitAccessMinutes: number;
  emergencyClearMinutes?: number;
  assumptions: {
    expectedVisitors: number;
    agentCount: number;
    peoplePerAgent: number;
    dwellMinutes: number;
    inflow: SimScenario;
  };
  disclaimer: string;
};

export type SimState = {
  time: number;
  agents: Agent[];
  occupancy: Record<string, number>;
  queues: Record<string, number>;
  visits: Record<string, number>;
  waitSamples: number[];
  cellHits: number[][];
  spawned: number;
  grid: Grid;
  metrics?: SimMetrics;
};

const TICK = 0.25;
const SPEED = 0.08;
const SEPARATION = 0.025;

export function agentBudget(expectedVisitors: number): { agentCount: number; peoplePerAgent: number } {
  const agentCount = Math.min(MAX_AGENTS, Math.max(1, Math.round(expectedVisitors)));
  return { agentCount, peoplePerAgent: expectedVisitors / agentCount };
}

function purposeBias(purpose: EventPurpose): number {
  if (purpose === "performance") {
    return 1.2;
  }
  if (purpose === "market" || purpose === "promotion") {
    return 1.1;
  }
  return 1;
}

function entrancesOf(access: AccessPoint[]): AccessPoint[] {
  const list = access.filter((item) => item.roles.includes("entrance"));
  return list.length ? list : access;
}

function exitsOf(access: AccessPoint[]): AccessPoint[] {
  const list = access.filter((item) => item.roles.includes("exit"));
  return list.length ? list : access;
}

function pickEntrance(access: AccessPoint[]): AccessPoint {
  const list = entrancesOf(access);
  const total = list.reduce((sum, item) => sum + Math.max(0.01, item.flowShare), 0);
  let roll = Math.random() * total;
  for (const item of list) {
    roll -= Math.max(0.01, item.flowShare);
    if (roll <= 0) {
      return item;
    }
  }
  return list[0];
}

function pickExit(from: NormalizedPoint, access: AccessPoint[]): AccessPoint {
  return exitsOf(access).reduce((best, item) =>
    distance(from, item.position) < distance(from, best.position) ? item : best,
  );
}

function pickBooth(agent: Pick<Agent, "visited">, booths: ProgramBooth[], purpose: EventPurpose): ProgramBooth | null {
  const open = booths.filter((booth) => booth.position && !agent.visited.includes(booth.id));
  if (open.length === 0) {
    return null;
  }
  const bias = purposeBias(purpose);
  const weights = open.map((booth) => booth.popularity * bias * (1 + booth.dwellMinutes / 60));
  let roll = Math.random() * weights.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < open.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) {
      return open[i];
    }
  }
  return open[0];
}

function spawnRate(scenario: SimScenario, time: number, duration: number, remaining: number): number {
  if (scenario === "emergency" || remaining <= 0) {
    return 0;
  }
  if (scenario === "peak") {
    return time < duration * 0.25 ? remaining / Math.max(0.2, duration * 0.2) : remaining / Math.max(1, duration);
  }
  return remaining / Math.max(1, duration - time);
}

function cloneState(state: SimState): SimState {
  return {
    ...state,
    agents: state.agents.map((agent) => ({ ...agent, path: [...agent.path], visited: [...agent.visited] })),
    occupancy: { ...state.occupancy },
    queues: { ...state.queues },
    visits: { ...state.visits },
    waitSamples: [...state.waitSamples],
    cellHits: state.cellHits.map((row) => [...row]),
  };
}

function makeAgent(
  id: number,
  at: NormalizedPoint,
  weight: number,
  targetId: string,
  path: NormalizedPoint[],
): Agent {
  return {
    id,
    x: at.x,
    y: at.y,
    weight,
    visited: [],
    state: "walk",
    targetId,
    path,
    waitMinutes: 0,
    dwellLeft: 0,
    walked: 0,
  };
}

function sendToExit(agent: Agent, input: SimInput, grid: Grid): void {
  const exit = pickExit({ x: agent.x, y: agent.y }, input.accessPoints);
  agent.state = "walk";
  agent.targetId = "exit";
  agent.path = findPath(grid, { x: agent.x, y: agent.y }, exit.position);
}

export function createSimulation(input: SimInput): SimState {
  const { agentCount, peoplePerAgent } = agentBudget(input.expectedVisitors);
  const blocked = [
    ...input.booths.filter((booth) => booth.position).map((booth) => booth.position!),
    ...input.optionalFacilities.map((item) => item.position),
  ];
  const grid = buildWalkGrid(input.venuePolygon, blocked, 0.035, input.obstacles);
  const boothIds = input.booths.map((booth) => booth.id);
  const state: SimState = {
    time: 0,
    agents: [],
    occupancy: Object.fromEntries(boothIds.map((id) => [id, 0])),
    queues: Object.fromEntries(boothIds.map((id) => [id, 0])),
    visits: Object.fromEntries(boothIds.map((id) => [id, 0])),
    waitSamples: [],
    cellHits: Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => 0)),
    spawned: 0,
    grid,
  };

  if (input.scenario !== "emergency" || !input.accessPoints.length) {
    return state;
  }

  for (let i = 0; i < agentCount; i += 1) {
    const gate = pickEntrance(input.accessPoints);
    const agent = makeAgent(i, gate.position, peoplePerAgent, "exit", []);
    sendToExit(agent, input, grid);
    state.agents.push(agent);
  }
  state.spawned = agentCount;
  return state;
}

export function stepSimulation(state: SimState, input: SimInput): SimState {
  const { agentCount, peoplePerAgent } = agentBudget(input.expectedVisitors);
  const next = cloneState(state);
  next.time = state.time + TICK;
  const grid = state.grid;
  const remaining = agentCount - next.spawned;
  const toSpawn = Math.min(
    remaining,
    Math.max(0, Math.round(spawnRate(input.scenario, next.time, input.durationMinutes, remaining) * TICK)),
  );

  if (input.accessPoints.length) {
    for (let i = 0; i < toSpawn; i += 1) {
      const gate = pickEntrance(input.accessPoints);
      const booth = pickBooth({ visited: [] }, input.booths, input.purpose);
      const dest = booth?.position ?? pickExit(gate.position, input.accessPoints).position;
      next.agents.push(
        makeAgent(
          next.spawned,
          gate.position,
          peoplePerAgent,
          booth?.id ?? "exit",
          findPath(grid, gate.position, dest),
        ),
      );
      next.spawned += 1;
    }
  }

  if (input.scenario === "emergency") {
    for (const agent of next.agents) {
      if (agent.state === "leave") {
        continue;
      }
      if (agent.state === "dwell" && agent.targetId && agent.targetId !== "exit") {
        next.occupancy[agent.targetId] = Math.max(0, (next.occupancy[agent.targetId] ?? agent.weight) - agent.weight);
      }
      if (agent.state === "queue" && agent.targetId) {
        next.queues[agent.targetId] = Math.max(0, (next.queues[agent.targetId] ?? agent.weight) - agent.weight);
      }
      sendToExit(agent, input, grid);
    }
  }

  for (const agent of next.agents) {
    if (agent.state === "leave") {
      continue;
    }
    const col = Math.min(19, Math.max(0, Math.floor(agent.x * 20)));
    const row = Math.min(19, Math.max(0, Math.floor(agent.y * 20)));
    next.cellHits[row][col] += agent.weight;

    if (agent.state === "queue") {
      agent.waitMinutes += TICK;
      const booth = input.booths.find((item) => item.id === agent.targetId);
      const cap = Math.max(1, booth?.capacity ?? 1);
      if ((next.occupancy[agent.targetId ?? ""] ?? 0) + agent.weight <= cap) {
        next.queues[agent.targetId ?? ""] = Math.max(0, (next.queues[agent.targetId ?? ""] ?? agent.weight) - agent.weight);
        next.occupancy[agent.targetId ?? ""] = (next.occupancy[agent.targetId ?? ""] ?? 0) + agent.weight;
        next.visits[agent.targetId ?? ""] = (next.visits[agent.targetId ?? ""] ?? 0) + agent.weight;
        next.waitSamples.push(agent.waitMinutes);
        agent.state = "dwell";
        agent.dwellLeft = booth?.dwellMinutes ?? 8;
      }
      continue;
    }

    if (agent.state === "dwell") {
      agent.dwellLeft -= TICK;
      if (agent.dwellLeft > 0) {
        continue;
      }
      if (agent.targetId && agent.targetId !== "exit") {
        next.occupancy[agent.targetId] = Math.max(0, (next.occupancy[agent.targetId] ?? agent.weight) - agent.weight);
        agent.visited.push(agent.targetId);
      }
      const leaveEarly = input.scenario === "normal" && Math.random() < 0.08;
      const nextBooth = leaveEarly ? null : pickBooth(agent, input.booths, input.purpose);
      if (!nextBooth) {
        sendToExit(agent, input, grid);
      } else {
        agent.targetId = nextBooth.id;
        agent.state = "walk";
        agent.path = findPath(grid, { x: agent.x, y: agent.y }, nextBooth.position!);
      }
      continue;
    }

    let sepX = 0;
    let sepY = 0;
    let neighbors = 0;
    for (const other of next.agents) {
      if (other.id === agent.id || other.state === "leave") {
        continue;
      }
      const dx = agent.x - other.x;
      const dy = agent.y - other.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < SEPARATION) {
        sepX += dx / dist;
        sepY += dy / dist;
        neighbors += 1;
      }
    }
    if (neighbors) {
      agent.x += (sepX / neighbors) * 0.012;
      agent.y += (sepY / neighbors) * 0.012;
    }

    const waypoint = agent.path[0];
    if (!waypoint) {
      if (agent.targetId === "exit" || !agent.targetId) {
        agent.state = "leave";
        agent.exitTime = next.time;
      } else {
        const booth = input.booths.find((item) => item.id === agent.targetId);
        const cap = Math.max(1, booth?.capacity ?? 1);
        if ((next.occupancy[agent.targetId] ?? 0) + agent.weight > cap) {
          agent.state = "queue";
          next.queues[agent.targetId] = (next.queues[agent.targetId] ?? 0) + agent.weight;
        } else {
          next.occupancy[agent.targetId] = (next.occupancy[agent.targetId] ?? 0) + agent.weight;
          next.visits[agent.targetId] = (next.visits[agent.targetId] ?? 0) + agent.weight;
          agent.state = "dwell";
          agent.dwellLeft = booth?.dwellMinutes ?? 8;
        }
      }
      continue;
    }
    const dx = waypoint.x - agent.x;
    const dy = waypoint.y - agent.y;
    const dist = Math.hypot(dx, dy) || 0.0001;
    const step = Math.min(SPEED * TICK, dist);
    agent.x += (dx / dist) * step;
    agent.y += (dy / dist) * step;
    agent.walked += step;
    if (dist <= SPEED * TICK) {
      agent.path.shift();
    }
  }

  return next;
}

export function runSimulation(input: SimInput): { state: SimState; metrics: SimMetrics } {
  let state = createSimulation(input);
  const steps = Math.ceil(input.durationMinutes / TICK);
  for (let i = 0; i < steps; i += 1) {
    state = stepSimulation(state, input);
    if (input.scenario === "emergency" && state.agents.length && state.agents.every((agent) => agent.state === "leave")) {
      break;
    }
  }
  const metrics = summarize(state, input);
  return { state: { ...state, metrics }, metrics };
}

export function summarize(state: SimState, input: SimInput): SimMetrics {
  const { agentCount, peoplePerAgent } = agentBudget(input.expectedVisitors);
  const left = state.agents.filter((agent) => agent.state === "leave");
  const heat: HeatCell[] = [];
  for (let r = 0; r < 20; r += 1) {
    for (let c = 0; c < 20; c += 1) {
      const density = state.cellHits[r][c];
      if (density <= 0) {
        continue;
      }
      heat.push({ x: (c + 0.5) / 20, y: (r + 0.5) / 20, density });
    }
  }
  const bottlenecks = [...heat].sort((a, b) => b.density - a.density).slice(0, 3);
  const busiest = [...input.booths]
    .map((booth) => ({ id: booth.id, name: booth.name, visits: state.visits[booth.id] ?? 0 }))
    .sort((a, b) => b.visits - a.visits)
    .slice(0, 3);
  const avgWait = state.waitSamples.length
    ? state.waitSamples.reduce((sum, value) => sum + value, 0) / state.waitSamples.length
    : 0;
  const peakHeat = heat.reduce((max, cell) => Math.max(max, cell.density), 0) || 1;
  const emergencyClear = left.length ? Math.max(...left.map((agent) => agent.exitTime ?? 0)) : undefined;

  return {
    congestionScore: Math.min(1, peakHeat / (input.expectedVisitors * 0.15 || 1)),
    heat,
    averageWaitMinutes: avgWait,
    maxWaitMinutes: state.waitSamples.length ? Math.max(...state.waitSamples) : 0,
    averageWalkingDistance: state.agents.length
      ? state.agents.reduce((sum, agent) => sum + agent.walked, 0) / state.agents.length
      : 0,
    busiestBooths: busiest,
    bottlenecks,
    averageExitAccessMinutes: left.length
      ? left.reduce((sum, agent) => sum + (agent.exitTime ?? 0), 0) / left.length
      : 0,
    emergencyClearMinutes: input.scenario === "emergency" ? emergencyClear : undefined,
    assumptions: {
      expectedVisitors: input.expectedVisitors,
      agentCount,
      peoplePerAgent,
      dwellMinutes: input.booths.reduce((sum, booth) => sum + booth.dwellMinutes, 0) / Math.max(1, input.booths.length),
      inflow: input.scenario,
    },
    disclaimer: RESULT_DISCLAIMER,
  };
}

export function formatEstimate(value: number, unit = ""): string {
  const rounded = Number.isInteger(value) ? `${value}` : value.toFixed(1);
  return `${rounded}${unit} (추정)`;
}
