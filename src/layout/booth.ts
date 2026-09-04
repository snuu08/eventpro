import type { ProgramBooth } from "../types/eventProject";

export const DEFAULT_BOOTH_SIZE = { width: 0.08, height: 0.05 };

export type BoothFacing = "landscape" | "portrait";

export function boothSize(booth: Pick<ProgramBooth, "size">): { width: number; height: number } {
  return booth.size ?? DEFAULT_BOOTH_SIZE;
}

export function boothFacing(booth: Pick<ProgramBooth, "size" | "rotation">): BoothFacing {
  const size = boothSize(booth);
  return size.width >= size.height ? "landscape" : "portrait";
}

function landscapeSize(size: { width: number; height: number }): { width: number; height: number } {
  if (size.width === size.height) {
    return { ...DEFAULT_BOOTH_SIZE };
  }
  return size.width > size.height ? size : { width: size.height, height: size.width };
}

export function setBoothOrientation(booth: ProgramBooth, facing: BoothFacing): ProgramBooth {
  const landscape = landscapeSize(boothSize(booth));
  if (facing === "landscape") {
    return { ...booth, size: landscape, rotation: 0 };
  }
  return { ...booth, size: { width: landscape.height, height: landscape.width }, rotation: 90 };
}

export function flipBoothOrientation(booth: ProgramBooth): ProgramBooth {
  return setBoothOrientation(booth, boothFacing(booth) === "landscape" ? "portrait" : "landscape");
}
