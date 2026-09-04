import { expect, test } from "@playwright/test";

test("shows lab title and create fields only", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "행사구성 LAB" })).toBeVisible();
  await expect(page.getByText("행사 제목")).toBeVisible();
  await expect(page.getByText("편집 비밀번호")).toBeVisible();
  await expect(page.getByText("예상 참여 인원")).toBeVisible();
  await expect(page.getByText("부스 개수")).toBeVisible();
  await expect(page.getByText("행사 목적")).toBeVisible();
  await expect(page.getByText("날짜")).toHaveCount(0);
  await expect(page.getByText("예산")).toHaveCount(0);
});

test("unknown route stays in the app", async ({ page }) => {
  await page.goto("/no-such-page");
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
});
