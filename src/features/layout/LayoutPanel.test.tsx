import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { EVENT_PROJECT_SCHEMA_VERSION } from "../../types/eventProject";
import type { EventProjectRecord } from "../../project/schema";
import { UI_COPY } from "../../shared/copy";
import { LayoutPanel } from "./LayoutPanel";

const project: EventProjectRecord = {
  id: "p1",
  title: "테스트",
  passwordSalt: "s",
  passwordHash: "h",
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
    { id: "in", position: { x: 0.1, y: 0.5 }, roles: ["entrance"], flowShare: 1, label: "입구" },
    { id: "out", position: { x: 0.9, y: 0.5 }, roles: ["exit"], flowShare: 1, label: "출구" },
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
      position: { x: 0.3, y: 0.4 },
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
    },
  ],
  optionalFacilities: [],
  candidates: [],
  schemaVersion: EVENT_PROJECT_SCHEMA_VERSION,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("LayoutPanel custom-first", () => {
  it("lists programs and hides A B C until a pattern is chosen", () => {
    const onProject = vi.fn();
    const onSelect = vi.fn();
    render(<LayoutPanel project={project} onProject={onProject} selectedId="b1" onSelect={onSelect} />);

    expect(screen.getByText("프로그램 2개")).toBeInTheDocument();
    expect(screen.getByText(UI_COPY.customPlaceHint)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: UI_COPY.autoLayoutStart })).not.toBeInTheDocument();
    expect(screen.getByLabelText("사용자 지정")).toBeChecked();

    fireEvent.click(screen.getByRole("button", { name: /프로그램 1/ }));
    expect(onSelect).toHaveBeenCalledWith("b1");

    fireEvent.click(screen.getByRole("button", { name: "위치 지우기" }));
    expect(onProject).toHaveBeenCalled();
    const cleared = onProject.mock.calls.at(-1)?.[0] as EventProjectRecord;
    expect(cleared.booths.find((item) => item.id === "b1")?.position).toBeUndefined();

    fireEvent.click(screen.getByLabelText("일자형"));
    expect(screen.queryByRole("button", { name: UI_COPY.autoLayoutStart })).not.toBeInTheDocument();
    expect(onProject).toHaveBeenCalled();
    const withPattern = onProject.mock.calls.at(-1)?.[0] as EventProjectRecord;
    expect(withPattern.layoutRules?.pattern).toBe("linear");
  });

  it("previews aisle width only while the slider is held", () => {
    const onGapPreview = vi.fn();
    const started = { ...project, layoutRules: { ...project.layoutRules, pattern: "linear" as const, aisleWidth: 0.04, boothGap: 0.03, entranceClearance: 0.06, exitClearance: 0.06, keepPopularBoothsApart: true, keepNoisyZoneAwayFromQuietZone: true } };
    render(<LayoutPanel project={started} onProject={vi.fn()} onSelect={vi.fn()} onGapPreview={onGapPreview} />);
    const slider = screen.getByLabelText("통로 폭");
    fireEvent.pointerDown(slider);
    expect(onGapPreview).toHaveBeenCalledWith(expect.objectContaining({ kind: "aisle" }));
    fireEvent.pointerUp(slider);
    expect(onGapPreview).toHaveBeenLastCalledWith(null);
  });
});
