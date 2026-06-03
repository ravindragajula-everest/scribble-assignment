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
    await page.goto("/create-room");
    await page.getByPlaceholder("Sketch captain").fill("Alice");
    await page.getByRole("button", { name: "Create and Continue" }).click();
    await expect(page).toHaveURL(/\/lobby/, { timeout: 10000 });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("Game screen has no violations after game starts", async ({ browser }) => {
    const hostCtx = await browser.newContext();
    const hostPage = await hostCtx.newPage();
    await hostPage.goto("/create-room");
    await hostPage.getByPlaceholder("Sketch captain").fill("Alice");
    await hostPage.getByRole("button", { name: "Create and Continue" }).click();
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 10000 });

    const code = await hostPage.locator(".room-code-badge__code").innerText();
    const guestCtx = await browser.newContext();
    const guestPage = await guestCtx.newPage();
    await guestPage.goto("/join-room");
    await guestPage.getByPlaceholder("Second pencil").fill("Bob");
    await guestPage.getByPlaceholder("ABCD").fill(code.trim());
    await guestPage.getByRole("button", { name: "Join Lobby" }).click();
    await expect(guestPage).toHaveURL(/\/lobby/, { timeout: 10000 });

    await hostPage.getByRole("button", { name: "Start Game" }).click();
    await expect(hostPage).toHaveURL(/\/game/, { timeout: 10000 });

    const results = await new AxeBuilder({ page: hostPage })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);

    await hostCtx.close();
    await guestCtx.close();
  });
});
