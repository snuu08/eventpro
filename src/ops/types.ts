export const OPS_LAYERS = ["all", "power", "waiting", "water", "noise", "type"] as const;
export type OpsLayer = (typeof OPS_LAYERS)[number];

export const OPS_LAYER_LABELS: Record<OpsLayer, string> = {
  all: "전체",
  power: "전력",
  waiting: "대기",
  water: "급수",
  noise: "소음",
  type: "유형",
};

export interface OpsCounts {
  power: number;
  internet: number;
  water: number;
  drainage: number;
  waiting: number;
  storage: number;
  noiseHigh: number;
  wasteHigh: number;
}
