import { test, expect } from "@playwright/test";

test.describe("Create Room — input validation", () => {
  test("shows error and stays on page when name is empty", async ({ page }) => {
    await page.goto("/create-room");
    await page.getByRole("button", { name: "Create and Continue" }).click();
    await expect(page.getByText("Player name is required")).toBeVisible();
    expect(page.url()).toContain("/create-room");
  });

  test("shows error for whitespace-only name", async ({ page }) => {
    await page.goto("/create-room");
    await page.getByPlaceholder("Sketch captain").fill("   ");
    await page.getByRole("button", { name: "Create and Continue" }).click();
    await expect(page.getByText("Player name is required")).toBeVisible();
  });

  test("navigates to lobby with a valid name", async ({ page }) => {
    await page.goto("/create-room");
    await page.getByPlaceholder("Sketch captain").fill("Alice");
    await page.getByRole("button", { name: "Create and Continue" }).click();
    await expect(page).toHaveURL(/\/lobby/, { timeout: 10000 });
  });
});

test.describe("Join Room — input validation", () => {
  test("shows error when name is empty", async ({ page }) => {
    await page.goto("/join-room");
    await page.getByRole("button", { name: "Join Lobby" }).click();
    await expect(page.getByText("Player name is required")).toBeVisible();
    expect(page.url()).toContain("/join-room");
  });

  test("shows error when code is empty but name is valid", async ({ page }) => {
    await page.goto("/join-room");
    await page.getByPlaceholder("Second pencil").fill("Bob");
    await page.getByRole("button", { name: "Join Lobby" }).click();
    await expect(page.getByText("Room code is required")).toBeVisible();
  });

  test("shows server error for non-existent room code", async ({ page }) => {
    await page.goto("/join-room");
    await page.getByPlaceholder("Second pencil").fill("Bob");
    await page.getByPlaceholder("ABCD").fill("ZZZZ");
    await page.getByRole("button", { name: "Join Lobby" }).click();
    await expect(page.getByText(/unable to join room/i)).toBeVisible({ timeout: 10000 });
  });
});
