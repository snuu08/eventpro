import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AppRoutes } from "./AppRoutes";

function renderPath(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("routes", () => {
  it("shows the home shell", () => {
    renderPath("/");
    expect(screen.getByRole("heading", { name: "행사구성 LAB" })).toBeInTheDocument();
  });

  it("loads a missing project without crashing", async () => {
    renderPath("/project/demo-1");
    await waitFor(() => {
      expect(screen.getByText("프로젝트를 찾지 못했습니다.")).toBeInTheDocument();
    });
  });

  it("shows not found for unknown paths", () => {
    renderPath("/no-such-page");
    expect(screen.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeInTheDocument();
  });
});
