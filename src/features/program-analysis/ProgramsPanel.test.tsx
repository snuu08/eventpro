import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProgramAnalysisResult } from "../../ops/schema";
import type { ProgramBooth } from "../../types/eventProject";
import { ProgramsFields, ProgramsPanel } from "./ProgramsPanel";

const analyzeProgram = vi.hoisted(() => vi.fn());

vi.mock("../../ops/analyzeProgram", () => ({
  analyzeProgram: (...args: unknown[]) => analyzeProgram(...args),
}));

const booth: ProgramBooth = {
  id: "b1",
  name: "체험부스",
  description: "VR 체험",
  category: "체험",
  dwellMinutes: 8,
  capacity: 10,
  popularity: 3,
  requirements: [],
};

const draft: ProgramAnalysisResult = {
  summary: "전원과 대기 공간이 필요합니다.",
  requirements: [
    { key: "power", level: "high", reason: "VR 장비 전력" },
    { key: "queue-space", level: "medium", reason: "대기줄" },
  ],
  questions: [],
  warnings: [],
  source: "ai",
  confidence: "medium",
  sourceLabel: "AI 분석",
};

function renderPanel() {
  return render(
    <ProgramsPanel booths={[booth]} selectedId={booth.id} onSelect={vi.fn()} onChangeBooth={vi.fn()} />,
  );
}

describe("ProgramsPanel draft accordion", () => {
  beforeEach(() => {
    analyzeProgram.mockReset();
    analyzeProgram.mockResolvedValue(draft);
  });

  it("keeps the draft collapsed until the header is clicked", async () => {
    renderPanel();
    expect(screen.queryByLabelText("프로그램명")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "운영조건 분석" }));

    const header = await screen.findByRole("button", { name: /AI 초안/ });
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("운영조건 2건")).toBeInTheDocument();
    expect(screen.queryByText(draft.summary)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "반영" })).not.toBeInTheDocument();

    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(draft.summary)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "반영" })).toHaveLength(2);

    fireEvent.click(header);
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(draft.summary)).not.toBeInTheDocument();
  });

  it("collapses again after a new analysis", async () => {
    renderPanel();
    fireEvent.click(screen.getByRole("button", { name: "운영조건 분석" }));
    const header = await screen.findByRole("button", { name: /AI 초안/ });
    fireEvent.click(header);
    expect(screen.getByText(draft.summary)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "운영조건 분석" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /AI 초안/ })).toHaveAttribute("aria-expanded", "false");
    });
    expect(screen.queryByText(draft.summary)).not.toBeInTheDocument();
  });
});

describe("ProgramsFields", () => {
  it("edits name through popularity on the selected booth", () => {
    const onChangeBooth = vi.fn();
    render(<ProgramsFields booth={booth} onChangeBooth={onChangeBooth} />);
    fireEvent.change(screen.getByLabelText("프로그램명"), { target: { value: "새 이름" } });
    expect(onChangeBooth).toHaveBeenCalledWith(expect.objectContaining({ name: "새 이름" }));
    expect(screen.getByLabelText("인기도")).toBeInTheDocument();
  });
});
