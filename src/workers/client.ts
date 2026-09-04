import type { AutoLayoutInput, AutoLayoutResult } from "../layout/autoLayout";
import type { SimInput, SimMetrics } from "../sim/simulate";

function runWorker<I, O>(url: URL, input: I): Promise<O> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(url, { type: "module" });
    worker.onmessage = (event: MessageEvent<O>) => {
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };
    worker.postMessage(input);
  });
}

export function runLayoutWorker(input: AutoLayoutInput): Promise<AutoLayoutResult> {
  return runWorker(new URL("./layout.worker.ts", import.meta.url), input);
}

export function runSimWorker(input: SimInput): Promise<SimMetrics> {
  return runWorker(new URL("./sim.worker.ts", import.meta.url), input);
}
