import { runSimulation, type SimInput, type SimMetrics } from "../sim/simulate";

self.onmessage = (event: MessageEvent<SimInput>) => {
  const { metrics } = runSimulation(event.data);
  self.postMessage(metrics as SimMetrics);
};
