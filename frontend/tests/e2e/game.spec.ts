import { test, expect, type Browser } from "@playwright/test";

async function hostStartsGame(browser: Browser, hostName = "Alice", guestName = "Bob") {
  const hostCtx = await browser.newContext();
  const hostPage = await hostCtx.newPage();
  await hostPage.goto("/create-room");
  await hostPage.getByPlaceholder("Sketch captain").fill(hostName);
  await hostPage.getByRole("button", { name: "Create and Continue" }).click();
  await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 10000 });

  const code = await hostPage.locator(".room-code-badge__code").innerText();

  const guestCtx = await browser.newContext();
  const guestPage = await guestCtx.newPage();
  await guestPage.goto("/join-room");
  await guestPage.getByPlaceholder("Second pencil").fill(guestName);
  await guestPage.getByPlaceholder("ABCD").fill(code.trim());
  await guestPage.getByRole("button", { name: "Join Lobby" }).click();
  await expect(guestPage).toHaveURL(/\/lobby/, { timeout: 10000 });

  await hostPage.getByRole("button", { name: "Start Game" }).click();
  await expect(hostPage).toHaveURL(/\/game/, { timeout: 10000 });

  return { hostCtx, hostPage, guestCtx, guestPage, code: code.trim() };
}

// ─── US1: Host Starts the Game ───────────────────────────────────────────────

test.describe("US1 — Host starts the game", () => {
  test("host navigates to /game after clicking Start Game", async ({ browser }) => {
    const { hostCtx, guestCtx } = await hostStartsGame(browser);
    await hostCtx.close();
    await guestCtx.close();
  });
});

// ─── US2: Non-Host Auto-Navigate ─────────────────────────────────────────────

test.describe("US2 — Non-host auto-navigates to /game", () => {
  test("non-host automatically navigates to /game within 2500ms after host starts", async ({ browser }) => {
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

    await expect(guestPage).toHaveURL(/\/game/, { timeout: 2500 });

    await hostCtx.close();
    await guestCtx.close();
  });

  test("navigating within app to /game while in lobby status redirects to /lobby", async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto("/create-room");
    await page.getByPlaceholder("Sketch captain").fill("Alice");
    await page.getByRole("button", { name: "Create and Continue" }).click();
    await expect(page).toHaveURL(/\/lobby/, { timeout: 10000 });

    // SPA navigation — pushState + popstate so React Router re-renders GamePage
    await page.evaluate(() => {
      globalThis.history.pushState({}, "", "/game");
      globalThis.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });
    await page.waitForURL(/\/lobby/, { timeout: 5000 });

    await ctx.close();
  });

  test("direct /game URL with no room in session redirects to home", async ({ page }) => {
    // Fresh page — RoomStore is empty (no room in session), GamePage redirects to /
    await page.goto("/game");
    await expect(page).not.toHaveURL(/\/game/, { timeout: 5000 });
  });
});

// ─── US3: Drawer and Word Visibility ─────────────────────────────────────────

test.describe("US3 — Drawer and word visibility on Game screen", () => {
  test("host (drawer) sees secret word 'rocket' on Game screen", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx } = await hostStartsGame(browser);
    await expect(hostPage.getByText("rocket")).toBeVisible({ timeout: 5000 });
    await hostCtx.close();
    await guestCtx.close();
  });

  test("host sees role label 'Drawer' in Player Info", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx } = await hostStartsGame(browser);
    // Use locator scoped to the role <dd> to avoid strict-mode collision with the <dt>Drawer</dt> label
    await expect(hostPage.locator("dd").filter({ hasText: /^Drawer$/ }).first()).toBeVisible({ timeout: 5000 });
    await hostCtx.close();
    await guestCtx.close();
  });

  test("non-host (guesser) does NOT see 'rocket' on Game screen", async ({ browser }) => {
    const { hostCtx, guestCtx, guestPage } = await hostStartsGame(browser);
    await expect(guestPage).toHaveURL(/\/game/, { timeout: 5000 });
    await expect(guestPage.getByText("rocket")).not.toBeVisible();
    await hostCtx.close();
    await guestCtx.close();
  });

  test("non-host sees role label 'Guesser'", async ({ browser }) => {
    const { hostCtx, guestCtx, guestPage } = await hostStartsGame(browser);
    await expect(guestPage).toHaveURL(/\/game/, { timeout: 5000 });
    await expect(guestPage.getByText("Guesser")).toBeVisible({ timeout: 5000 });
    await hostCtx.close();
    await guestCtx.close();
  });

  test("drawer name is visible on Game screen for all players", async ({ browser }) => {
    // Use distinct names so "Alice" = drawer name (not also viewer name for guest)
    const { hostCtx, hostPage, guestCtx, guestPage } = await hostStartsGame(browser, "Alice", "Bob");
    await expect(guestPage).toHaveURL(/\/game/, { timeout: 5000 });

    // "Alice" appears in scoreboard AND in drawer name field — use first() for both
    await expect(guestPage.getByText("Alice").first()).toBeVisible({ timeout: 5000 });
    await expect(hostPage.getByText("Alice").first()).toBeVisible({ timeout: 5000 });

    await hostCtx.close();
    await guestCtx.close();
  });
});
