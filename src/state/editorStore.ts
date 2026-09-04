import { create } from "zustand";

export type EditorTool = "select" | "polygon" | "entrance" | "exit" | "booth";

type EditorState = {
  selectedIds: string[];
  tool: EditorTool;
  workspaceZoom: number;
  heatmapOn: boolean;
  simPlaying: boolean;
  setSelectedIds: (ids: string[]) => void;
  setTool: (tool: EditorTool) => void;
  setWorkspaceZoom: (zoom: number) => void;
  setHeatmapOn: (on: boolean) => void;
  setSimPlaying: (on: boolean) => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  selectedIds: [],
  tool: "select",
  workspaceZoom: 1,
  heatmapOn: false,
  simPlaying: false,
  setSelectedIds: (selectedIds) => set({ selectedIds }),
  setTool: (tool) => set({ tool }),
  setWorkspaceZoom: (zoom) => set({ workspaceZoom: Math.min(2, Math.max(0.5, zoom)) }),
  setHeatmapOn: (heatmapOn) => set({ heatmapOn }),
  setSimPlaying: (simPlaying) => set({ simPlaying }),
}));
