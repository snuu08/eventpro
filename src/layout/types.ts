import type { GeoPoint, RectBounds } from "../maps/types";

export const LAYOUT_STYLES = ["aisle", "zone", "grid"] as const;
export type LayoutStyle = (typeof LAYOUT_STYLES)[number];

export interface BoothPlacement {
  boothId: string;
  code: string;
  center: GeoPoint;
  sw: GeoPoint;
  ne: GeoPoint;
}

export interface LayoutRecommendation {
  style: LayoutStyle;
  reason: string;
}

export interface LayoutState {
  style: LayoutStyle;
  workBounds: RectBounds | null;
  placements: BoothPlacement[];
  recommendation: LayoutRecommendation | null;
}

export const EMPTY_LAYOUT: LayoutState = {
  style: "grid",
  workBounds: null,
  placements: [],
  recommendation: null,
};

export const LAYOUT_META: Record<LayoutStyle, { title: string; description: string }> = {
  aisle: {
    title: "중앙통로형",
    description: "중앙에 주 통로를 만들고 양쪽에 부스를 배치합니다.",
  },
  zone: {
    title: "구역형",
    description: "비슷한 성격의 부스를 가까이 배치합니다.",
  },
  grid: {
    title: "격자형",
    description: "공간을 효율적으로 사용할 수 있도록 일정하게 배치합니다.",
  },
};

export const BOOTH_SIZE_M = { width: 4, height: 3 };
export const BOOTH_GAP_M = 1.6;
export const AISLE_WIDTH_M = 5;
export const WORK_PAD_M = 2.5;
export const PORTAL_BUFFER_M = 5;
