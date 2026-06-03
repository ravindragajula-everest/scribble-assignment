import { test, expect, type Browser } from "@playwright/test";

async function createRoomAndGetCode(browser: Browser, hostName: string) {
  const hostCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  await hostPage.goto("/create-room");
  await hostPage.getByPlaceholder("Sketch captain").fill(hostName);
  await hostPage.getByRole("button", { name: "Create and Continue" }).click();
  await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 10000 });
  const code = await hostPage.locator(".room-code-badge__code").innerText();
  return { hostCtx, hostPage, code: code.trim() };
}

// ─── US3: Host-Only Start Game Button ───────────────────────────────────────

test.describe("US3 — Host-only Start Game button", () => {
  test("host sees disabled Start Game button with only 1 player", async ({ page }) => {
    await page.goto("/create-room");
    await page.getByPlaceholder("Sketch captain").fill("Alice");
    await page.getByRole("button", { name: "Create and Continue" }).click();
    await expect(page).toHaveURL(/\/lobby/, { timeout: 10000 });

    const startBtn = page.getByRole("button", { name: "Start Game" });
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeDisabled();
  });

  test("non-host does not see Start Game button", async ({ browser }) => {
    const { hostCtx, code } = await createRoomAndGetCode(browser, "Alice");

    const guestCtx = await browser.newContext();
    const guestPage = await guestCtx.newPage();
    await guestPage.goto("/join-room");
    await guestPage.getByPlaceholder("Second pencil").fill("Bob");
    await guestPage.getByPlaceholder("ABCD").fill(code);
    await guestPage.getByRole("button", { name: "Join Lobby" }).click();
    await expect(guestPage).toHaveURL(/\/lobby/, { timeout: 10000 });

    await expect(guestPage.getByRole("button", { name: "Start Game" })).not.toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("clicking enabled Start Game button causes no navigation", async ({ browser }) => {
    const { hostCtx, hostPage, code } = await createRoomAndGetCode(browser, "Alice");

    const guestCtx = await browser.newContext();
    const guestPage = await guestCtx.newPage();
    await guestPage.goto("/join-room");
    await guestPage.getByPlaceholder("Second pencil").fill("Bob");
    await guestPage.getByPlaceholder("ABCD").fill(code);
    await guestPage.getByRole("button", { name: "Join Lobby" }).click();
    await expect(guestPage).toHaveURL(/\/lobby/, { timeout: 10000 });

    // Host lobby polls every 2s — Bob should appear within 5s
    const startBtn = hostPage.getByRole("button", { name: "Start Game" });
    await expect(startBtn).toBeEnabled({ timeout: 8000 });

    await startBtn.click();
    expect(hostPage.url()).toContain("/lobby");

    await hostCtx.close();
    await guestCtx.close();
  });
});

// ─── US4: Automatic Lobby Polling ────────────────────────────────────────────

test.describe("US4 — Automatic lobby polling", () => {
  test("second player appears in host lobby within 2500ms without manual action", async ({ browser }) => {
    const { hostCtx, hostPage, code } = await createRoomAndGetCode(browser, "Alice");

    const guestCtx = await browser.newContext();
    const guestPage = await guestCtx.newPage();
    await guestPage.goto("/join-room");
    await guestPage.getByPlaceholder("Second pencil").fill("Bob");
    await guestPage.getByPlaceholder("ABCD").fill(code);
    await guestPage.getByRole("button", { name: "Join Lobby" }).click();
    await expect(guestPage).toHaveURL(/\/lobby/, { timeout: 10000 });

    // Host lobby should auto-update without any interaction
    await expect(hostPage.getByText("Bob")).toBeVisible({ timeout: 2500 });

    await hostCtx.close();
    await guestCtx.close();
  });
});
