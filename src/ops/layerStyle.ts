import type { Booth, BoothType } from "../booth/types";
import type { OpsLayer } from "./types";

const TYPE_COLORS: Record<BoothType, string> = {
  experience: "#2d6a4f",
  promotion: "#1d4e89",
  consultation: "#5c4d7a",
  sales: "#9a3412",
  exhibition: "#57534e",
  food: "#b45309",
  event: "#0f766e",
  other: "#64748b",
};

export interface BoothLayerStyle {
  color: string;
  dimmed: boolean;
}

export function boothLayerStyle(booth: Booth | undefined, layer: OpsLayer): BoothLayerStyle {
  const analysis = booth?.analysis;
  if (layer === "all") {
    return { color: "#2d6a4f", dimmed: false };
  }

  if (layer === "power") {
    const on = analysis?.power.value === "required";
    return { color: on ? "#b45309" : "#94a3b8", dimmed: !on };
  }

  if (layer === "waiting") {
    const on = analysis?.waitingArea.value === "required";
    return { color: on ? "#1d4e89" : "#94a3b8", dimmed: !on };
  }

  if (layer === "water") {
    const on = analysis?.water.value === "required";
    return { color: on ? "#0e7490" : "#94a3b8", dimmed: !on };
  }

  if (layer === "noise") {
    if (analysis?.noise.value === "high") {
      return { color: "#9b2226", dimmed: false };
    }
    if (analysis?.noise.value === "medium") {
      return { color: "#b08900", dimmed: false };
    }
    return { color: "#94a3b8", dimmed: true };
  }

  const type = analysis?.type.value ?? "other";
  return { color: TYPE_COLORS[type], dimmed: false };
}
