import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Accessibility — WCAG 2.1 AA", () => {
  test("Create Room page has no violations", async ({ page }) => {
    await page.goto("/create-room");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("Join Room page has no violations", async ({ page }) => {
    await page.goto("/join-room");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("Create Room page shows accessible error state", async ({ page }) => {
    await page.goto("/create-room");
    await page.getByRole("button", { name: "Create and Continue" }).click();
    await expect(page.getByText("Player name is required")).toBeVisible();

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("Lobby page has no violations", async ({ page }) => {
    // Navigate to lobby via create room flow
    await page.goto("/create-room");
    await page.getByLabel("Player name").fill("Alice");
    await page.getByRole("button", { name: "Create and Continue" }).click();
    await expect(page).toHaveURL(/\/lobby/);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
