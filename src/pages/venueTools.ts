import type { FacilityKind, PortalKind } from "../types/venue";

export type VenueTool =
  | "select"
  | PortalKind
  | "zone"
  | FacilityKind;

export function isPortalTool(tool: VenueTool): tool is PortalKind {
  return tool === "entrance" || tool === "exit" || tool === "both";
}

export function isPresetFacilityTool(
  tool: VenueTool,
): tool is Exclude<FacilityKind, "special"> {
  return (
    tool === "stage" ||
    tool === "restroom" ||
    tool === "power" ||
    tool === "hq" ||
    tool === "info" ||
    tool === "other"
  );
}
