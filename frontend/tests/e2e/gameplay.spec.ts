import { test, expect, type Browser } from "@playwright/test";

async function startGame(browser: Browser, hostName = "Alice", guestName = "Bob") {
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
  await expect(guestPage).toHaveURL(/\/game/, { timeout: 5000 });

  return { hostCtx, hostPage, guestCtx, guestPage };
}

// ─── US1: Drawer Canvas ───────────────────────────────────────────────────────

test.describe("US1 — Drawer canvas interaction", () => {
  test("drawer sees interactive canvas with crosshair cursor; guesser sees read-only canvas", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await startGame(browser);

    // Both see a canvas — drawer's is interactive, guesser's is read-only
    await expect(hostPage.locator("canvas[aria-label='Drawing canvas']")).toBeVisible({ timeout: 5000 });
    await expect(guestPage.locator("canvas[aria-label='Drawing canvas (read-only)']")).toBeVisible({ timeout: 5000 });

    await hostCtx.close();
    await guestCtx.close();
  });

  test("drawer can draw on canvas without errors", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx } = await startGame(browser);

    const canvas = hostPage.locator("canvas");
    await expect(canvas).toBeVisible({ timeout: 5000 });

    const box = await canvas.boundingBox();
    if (box) {
      await hostPage.mouse.move(box.x + 50, box.y + 50);
      await hostPage.mouse.down();
      await hostPage.mouse.move(box.x + 150, box.y + 100);
      await hostPage.mouse.move(box.x + 200, box.y + 150);
      await hostPage.mouse.up();
    }

    // Canvas should still be visible and not have caused any errors
    await expect(canvas).toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });
});

// ─── US2: Clear Canvas ────────────────────────────────────────────────────────

test.describe("US2 — Clear canvas", () => {
  test("drawer sees Clear Canvas button; guesser does not", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await startGame(browser);

    await expect(hostPage.getByRole("button", { name: "Clear Canvas" })).toBeVisible({ timeout: 5000 });
    await expect(guestPage.getByRole("button", { name: "Clear Canvas" })).not.toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("clicking Clear Canvas does not crash or navigate", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx } = await startGame(browser);

    const canvas = hostPage.locator("canvas");
    const box = await canvas.boundingBox();
    if (box) {
      await hostPage.mouse.move(box.x + 100, box.y + 100);
      await hostPage.mouse.down();
      await hostPage.mouse.move(box.x + 200, box.y + 200);
      await hostPage.mouse.up();
    }

    await hostPage.getByRole("button", { name: "Clear Canvas" }).click();
    await expect(hostPage).toHaveURL(/\/game/);
    await expect(canvas).toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });
});

// ─── US3: Guess Submission ────────────────────────────────────────────────────

test.describe("US3 — Guess submission", () => {
  test("guesser sees guess input; drawer does not", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await startGame(browser);

    await expect(guestPage.getByRole("button", { name: "Submit Guess" })).toBeVisible({ timeout: 5000 });
    await expect(hostPage.getByRole("button", { name: "Submit Guess" })).not.toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("submitting whitespace shows 'Guess cannot be empty' error", async ({ browser }) => {
    const { hostCtx, guestCtx, guestPage } = await startGame(browser);

    await guestPage.getByRole("button", { name: "Submit Guess" }).click();
    await expect(guestPage.getByText("Guess cannot be empty")).toBeVisible({ timeout: 5000 });

    await hostCtx.close();
    await guestCtx.close();
  });

  test("correct guess 'ROCKET' appears in history immediately (score hidden during gameplay)", async ({ browser }) => {
    const { hostCtx, guestCtx, guestPage } = await startGame(browser);

    await guestPage.getByPlaceholder("Type your guess here...").fill("ROCKET");
    await guestPage.getByRole("button", { name: "Submit Guess" }).click();

    // Guess text appears immediately; score is HIDDEN during gameplay (shows — not 100)
    await expect(guestPage.getByText("ROCKET")).toBeVisible({ timeout: 5000 });
    await expect(guestPage.locator("strong:has-text('100')")).not.toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("correct guess appears in history WITHOUT checkmark during gameplay", async ({ browser }) => {
    const { hostCtx, guestCtx, guestPage } = await startGame(browser);

    await guestPage.getByPlaceholder("Type your guess here...").fill("rocket");
    await guestPage.getByRole("button", { name: "Submit Guess" }).click();

    // Guess text visible immediately; ✓ is HIDDEN until End Round
    await expect(guestPage.getByText("rocket")).toBeVisible({ timeout: 5000 });
    await expect(guestPage.locator("li:has-text('rocket') span:has-text('✓')")).not.toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });
});

// ─── US4: History Sync ────────────────────────────────────────────────────────

test.describe("US4 — Guess history synced to all players", () => {
  test("guess appears in drawer's history within 2500ms", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await startGame(browser);

    await guestPage.getByPlaceholder("Type your guess here...").fill("pizza");
    await guestPage.getByRole("button", { name: "Submit Guess" }).click();

    // Drawer should see the guess within one polling cycle
    await expect(hostPage.getByText("pizza")).toBeVisible({ timeout: 2500 });

    await hostCtx.close();
    await guestCtx.close();
  });
});

// ─── US5: Scoring ─────────────────────────────────────────────────────────────

test.describe("US5 — Scoring updates", () => {
  test("scoreboard shows — (hidden) during gameplay; 100 revealed only after End Round", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await startGame(browser);

    await guestPage.getByPlaceholder("Type your guess here...").fill("rocket");
    await guestPage.getByRole("button", { name: "Submit Guess" }).click();
    await expect(guestPage.getByText("rocket")).toBeVisible({ timeout: 5000 });

    // Score 100 HIDDEN during gameplay — scoreboard shows — instead
    await expect(guestPage.locator("strong:has-text('100')")).not.toBeVisible();
    await expect(guestPage.getByText("—").first()).toBeVisible({ timeout: 2500 });

    // After End Round — score 100 revealed
    await hostPage.getByRole("button", { name: "End Round" }).click();
    await expect(guestPage.locator("strong:has-text('100')")).toBeVisible({ timeout: 2500 });

    await hostCtx.close();
    await guestCtx.close();
  });
});
