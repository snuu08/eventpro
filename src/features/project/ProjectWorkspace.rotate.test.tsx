import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppRoutes } from "../../app/AppRoutes";
import { DEFAULT_BOOTH_SIZE } from "../../layout/booth";
import { db, saveProject } from "../../project/db";
import type { EventProjectRecord } from "../../project/schema";
import { UI_COPY } from "../../shared/copy";
import { useEditorStore } from "../../state/editorStore";
import { EVENT_PROJECT_SCHEMA_VERSION } from "../../types/eventProject";

const project: EventProjectRecord = {
  id: "rotate-project",
  title: "회전 확인",
  passwordSalt: "c2FsdA==",
  passwordHash: "aGFzaA==",
  expectedVisitors: 100,
  boothCount: 2,
  purpose: "market",
  venuePolygon: [
    { x: 0.1, y: 0.1 },
    { x: 0.9, y: 0.1 },
    { x: 0.9, y: 0.9 },
    { x: 0.1, y: 0.9 },
  ],
  accessPoints: [
    { id: "in", position: { x: 0.15, y: 0.5 }, roles: ["entrance"], flowShare: 1, label: "입구" },
    { id: "out", position: { x: 0.85, y: 0.5 }, roles: ["exit"], flowShare: 1, label: "출구" },
  ],
  booths: [
    {
      id: "b1",
      name: "프로그램 1",
      description: "",
      category: "",
      dwellMinutes: 8,
      capacity: 10,
      popularity: 3,
      requirements: [],
      position: { x: 0.4, y: 0.5 },
      size: { width: 0.06, height: 0.06 },
      rotation: 0,
    },
    {
      id: "b2",
      name: "프로그램 2",
      description: "",
      category: "",
      dwellMinutes: 8,
      capacity: 10,
      popularity: 3,
      requirements: [],
      position: { x: 0.65, y: 0.5 },
      size: { ...DEFAULT_BOOTH_SIZE },
      rotation: 0,
    },
  ],
  optionalFacilities: [],
  layoutRules: {
    pattern: "custom",
    aisleWidth: 0.04,
    boothGap: 0.03,
    entranceClearance: 0.06,
    exitClearance: 0.06,
    keepPopularBoothsApart: true,
    keepNoisyZoneAwayFromQuietZone: true,
  },
  candidates: [],
  schemaVersion: EVENT_PROJECT_SCHEMA_VERSION,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("layout rotate buttons", () => {
  beforeEach(async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    );
    await db.projects.clear();
    sessionStorage.clear();
    useEditorStore.setState({ selectedIds: [] });
    await saveProject(project);
    sessionStorage.setItem(`eventlab-unlock:${project.id}`, "1");
  });

  it("rotates the visible booth with 가로/세로 and drops the map re-click copy", async () => {
    render(
      <MemoryRouter initialEntries={[`/project/${project.id}`]}>
        <AppRoutes />
      </MemoryRouter>,
    );
    await screen.findByText("회전 확인");
    fireEvent.click(await screen.findByRole("button", { name: "배치" }));
    expect(screen.queryByText(/지도에서 같은 부스를 다시 클릭/)).not.toBeInTheDocument();
    expect(screen.getByText(UI_COPY.boothRotateHint)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "세로" }));
    await waitFor(async () => {
      const row = await db.projects.get(project.id);
      expect(row?.booths.find((item) => item.id === "b1")?.size).toEqual({
        width: DEFAULT_BOOTH_SIZE.height,
        height: DEFAULT_BOOTH_SIZE.width,
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "가로" }));
    await waitFor(async () => {
      const row = await db.projects.get(project.id);
      expect(row?.booths.find((item) => item.id === "b1")?.size).toEqual(DEFAULT_BOOTH_SIZE);
    });

    fireEvent.click(screen.getByRole("button", { name: /프로그램 2/ }));
    fireEvent.click(screen.getByRole("button", { name: "세로" }));
    await waitFor(async () => {
      const row = await db.projects.get(project.id);
      expect(row?.booths.find((item) => item.id === "b2")?.size).toEqual({
        width: DEFAULT_BOOTH_SIZE.height,
        height: DEFAULT_BOOTH_SIZE.width,
      });
      expect(row?.booths.find((item) => item.id === "b1")?.size).toEqual(DEFAULT_BOOTH_SIZE);
    });
  });
});
