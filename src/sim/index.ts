export { MAX_AGENTS, RESULT_DISCLAIMER, type SimScenario } from "./constants";
export { buildWalkGrid, findPath, type Grid } from "./gridPath";
export { formatSimReport, type SimReportLines } from "./report";
export {
  agentBudget,
  createSimulation,
  formatEstimate,
  runSimulation,
  stepSimulation,
  summarize,
  type Agent,
  type HeatCell,
  type SimInput,
  type SimMetrics,
  type SimState,
} from "./simulate";
