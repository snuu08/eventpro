import type { Booth } from "../booth/types";
import type { OpsCounts } from "./types";

function requiredCount(booths: Booth[], field: "power" | "internet" | "water" | "drainage" | "waitingArea" | "storage"): number {
  return booths.filter((booth) => booth.analysis?.[field].value === "required").length;
}

export function summarizeOps(booths: Booth[]): OpsCounts {
  return {
    power: requiredCount(booths, "power"),
    internet: requiredCount(booths, "internet"),
    water: requiredCount(booths, "water"),
    drainage: requiredCount(booths, "drainage"),
    waiting: requiredCount(booths, "waitingArea"),
    storage: requiredCount(booths, "storage"),
    noiseHigh: booths.filter((booth) => booth.analysis?.noise.value === "high").length,
    wasteHigh: booths.filter((booth) => booth.analysis?.waste.value === "high").length,
  };
}
