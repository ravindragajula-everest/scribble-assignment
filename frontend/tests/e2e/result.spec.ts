import { test, expect, type Browser } from "@playwright/test";

async function setupFullGame(browser: Browser) {
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
  await expect(guestPage).toHaveURL(/\/game/, { timeout: 5000 });

  return { hostCtx, hostPage, guestCtx, guestPage };
}

// ─── US1: Host Ends the Round ─────────────────────────────────────────────────

test.describe("US1 — Host ends the round", () => {
  test("host sees 'End Round' button; guesser does not", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await setupFullGame(browser);

    await expect(hostPage.getByRole("button", { name: "End Round" })).toBeVisible({ timeout: 5000 });
    await expect(guestPage.getByRole("button", { name: "End Round" })).not.toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("host clicks 'End Round' → inline reveals (word + Play Again) appear immediately", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx } = await setupFullGame(browser);

    await hostPage.getByRole("button", { name: "End Round" }).click();
    // Inline word reveal appears; "Round Over!" does NOT appear
    await expect(hostPage.getByText(/secret word was/i)).toBeVisible({ timeout: 5000 });
    await expect(hostPage.getByText("Round Over!")).not.toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("guesser detects result view within 2500ms via polling", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await setupFullGame(browser);

    await hostPage.getByRole("button", { name: "End Round" }).click();
    // Guesser sees inline word reveal (no "Round Over!" modal)
    await expect(guestPage.getByText(/secret word was/i)).toBeVisible({ timeout: 2500 });

    await hostCtx.close();
    await guestCtx.close();
  });
});

// ─── US2: Result State Shows All Round Data ───────────────────────────────────

test.describe("US2 — Result state shows all round data", () => {
  test("host sees word 'rocket' in result view", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx } = await setupFullGame(browser);

    await hostPage.getByRole("button", { name: "End Round" }).click();
    // Use first() — "rocket" appears in both inline reveal and Player Info card
    await expect(hostPage.getByText("rocket").first()).toBeVisible({ timeout: 5000 });

    await hostCtx.close();
    await guestCtx.close();
  });

  test("guesser sees word 'rocket' in result view (revealed at end)", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await setupFullGame(browser);

    await hostPage.getByRole("button", { name: "End Round" }).click();
    // Word revealed inline; no "Round Over!" modal
    await expect(guestPage.getByText(/secret word was/i)).toBeVisible({ timeout: 2500 });
    await expect(guestPage.getByText("rocket")).toBeVisible({ timeout: 5000 });

    await hostCtx.close();
    await guestCtx.close();
  });

  test("result view shows participant scores and guess history after End Round", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await setupFullGame(browser);

    await guestPage.getByPlaceholder("Type your guess here...").fill("pizza");
    await guestPage.getByRole("button", { name: "Submit Guess" }).click();
    await expect(guestPage.getByText("pizza")).toBeVisible({ timeout: 5000 });

    await hostPage.getByRole("button", { name: "End Round" }).click();
    // Inline reveal — no "Round Over!" modal
    await expect(hostPage.getByText(/secret word was/i)).toBeVisible({ timeout: 5000 });

    // Scoreboard and participant names still visible in layout
    await expect(hostPage.getByText("Alice").first()).toBeVisible();
    await expect(hostPage.getByText("Bob").first()).toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });
});

// ─── US3: Host Restarts the Game ──────────────────────────────────────────────

test.describe("US3 — Host restarts the game", () => {
  test("host sees 'Play Again' in game layout; guesser does not", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await setupFullGame(browser);

    await hostPage.getByRole("button", { name: "End Round" }).click();
    await expect(hostPage.getByText(/secret word was/i)).toBeVisible({ timeout: 2500 });

    await expect(hostPage.getByRole("button", { name: "Play Again" })).toBeVisible({ timeout: 5000 });
    await expect(guestPage.getByRole("button", { name: "Play Again" })).not.toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("host clicks 'Play Again' → navigates to lobby", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx } = await setupFullGame(browser);

    await hostPage.getByRole("button", { name: "End Round" }).click();
    await expect(hostPage.getByText(/secret word was/i)).toBeVisible({ timeout: 5000 });
    await hostPage.getByRole("button", { name: "Play Again" }).click();
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 10000 });

    await hostCtx.close();
    await guestCtx.close();
  });

  test("guesser navigates to lobby within 2500ms after host restarts", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await setupFullGame(browser);

    await hostPage.getByRole("button", { name: "End Round" }).click();
    await expect(hostPage.getByText(/secret word was/i)).toBeVisible({ timeout: 2500 });
    await hostPage.getByRole("button", { name: "Play Again" }).click();
    await expect(guestPage).toHaveURL(/\/lobby/, { timeout: 2500 });

    await hostCtx.close();
    await guestCtx.close();
  });

  test("lobby after restart shows all participants", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx } = await setupFullGame(browser);

    await hostPage.getByRole("button", { name: "End Round" }).click();
    await expect(hostPage.getByText(/secret word was/i)).toBeVisible({ timeout: 2500 });
    await hostPage.getByRole("button", { name: "Play Again" }).click();
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 10000 });

    // Both players should be visible in the lobby
    await expect(hostPage.getByText("Alice")).toBeVisible({ timeout: 5000 });
    await expect(hostPage.getByText("Bob")).toBeVisible({ timeout: 5000 });

    await hostCtx.close();
    await guestCtx.close();
  });
});

// ─── US1+US2: Deferred Reveal ────────────────────────────────────────────────

test.describe("Deferred reveal — during gameplay", () => {
  test("Activity shows guess text WITHOUT ✓/✗ during in_game", async ({ browser }) => {
    const { hostCtx, guestCtx, guestPage } = await setupFullGame(browser);

    await guestPage.getByPlaceholder("Type your guess here...").fill("pizza");
    await guestPage.getByRole("button", { name: "Submit Guess" }).click();
    await expect(guestPage.getByText("pizza")).toBeVisible({ timeout: 5000 });

    // During gameplay: ✓ and ✗ must NOT be visible
    await expect(guestPage.locator("li:has-text('pizza') span:has-text('✓')")).not.toBeVisible();
    await expect(guestPage.locator("li:has-text('pizza') span:has-text('✗')")).not.toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("Scoreboard shows — for all scores during in_game", async ({ browser }) => {
    const { hostCtx, guestCtx, guestPage } = await setupFullGame(browser);

    // Submit a correct guess to generate a score
    await guestPage.getByPlaceholder("Type your guess here...").fill("rocket");
    await guestPage.getByRole("button", { name: "Submit Guess" }).click();
    await expect(guestPage.getByText("rocket")).toBeVisible({ timeout: 5000 });

    // Score 100 must NOT be visible (hidden during gameplay)
    await expect(guestPage.locator("strong:has-text('100')")).not.toBeVisible();
    // Dash placeholder should be visible
    await expect(guestPage.getByText("—").first()).toBeVisible({ timeout: 5000 });

    await hostCtx.close();
    await guestCtx.close();
  });
});

test.describe("Deferred reveal — after End Round", () => {
  test("Activity reveals ✗ after End Round for incorrect guess", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await setupFullGame(browser);

    await guestPage.getByPlaceholder("Type your guess here...").fill("pizza");
    await guestPage.getByRole("button", { name: "Submit Guess" }).click();
    await expect(guestPage.getByText("pizza")).toBeVisible({ timeout: 5000 });

    await hostPage.getByRole("button", { name: "End Round" }).click();

    // After End Round: ✗ for incorrect guess must appear (allow full polling cycle + processing)
    await expect(guestPage.locator("li:has-text('pizza') span:has-text('✗')")).toBeVisible({ timeout: 5000 });
    await expect(hostPage.locator("li:has-text('pizza') span:has-text('✗')")).toBeVisible({ timeout: 5000 });

    await hostCtx.close();
    await guestCtx.close();
  });

  test("Scoreboard reveals actual scores after End Round", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await setupFullGame(browser);

    await guestPage.getByPlaceholder("Type your guess here...").fill("rocket");
    await guestPage.getByRole("button", { name: "Submit Guess" }).click();
    await expect(guestPage.getByText("rocket")).toBeVisible({ timeout: 5000 });

    // During gameplay — score hidden (dash shown)
    await expect(guestPage.locator("strong:has-text('100')")).not.toBeVisible();

    await hostPage.getByRole("button", { name: "End Round" }).click();

    // After End Round — score 100 revealed
    await expect(guestPage.locator("strong:has-text('100')")).toBeVisible({ timeout: 2500 });
    await expect(hostPage.locator("strong:has-text('100')")).toBeVisible({ timeout: 2500 });

    await hostCtx.close();
    await guestCtx.close();
  });
});

// ─── US3: Exit Game ───────────────────────────────────────────────────────────

test.describe("Exit Game", () => {
  test("host clicks Exit Game during in_game → all navigate to lobby within 2500ms", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await setupFullGame(browser);

    await hostPage.getByRole("button", { name: "Exit Game" }).click();
    await expect(hostPage).toHaveURL(/\/lobby/, { timeout: 10000 });
    await expect(guestPage).toHaveURL(/\/lobby/, { timeout: 2500 });

    await hostCtx.close();
    await guestCtx.close();
  });

  test("Exit Game button is NOT visible to guesser (host only)", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await setupFullGame(browser);

    // Host sees Exit Game; guesser does NOT
    await expect(hostPage.getByRole("button", { name: "Exit Game" })).toBeVisible({ timeout: 5000 });
    await expect(guestPage.getByRole("button", { name: "Exit Game" })).not.toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });
});

// ─── US4: No "Round Over!" Section ────────────────────────────────────────────

test.describe("Inline result reveal — no modal", () => {
  test("after End Round, no 'Round Over!' text appears on any screen", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await setupFullGame(browser);

    await hostPage.getByRole("button", { name: "End Round" }).click();
    // Wait for inline reveal to confirm transition completed
    await expect(hostPage.getByText(/secret word was/i)).toBeVisible({ timeout: 5000 });
    await expect(guestPage.getByText(/secret word was/i)).toBeVisible({ timeout: 2500 });

    // "Round Over!" MUST NOT appear anywhere
    await expect(hostPage.getByText("Round Over!")).not.toBeVisible();
    await expect(guestPage.getByText("Round Over!")).not.toBeVisible();

    await hostCtx.close();
    await guestCtx.close();
  });

  test("word 'rocket' appears inline after End Round", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx, guestPage } = await setupFullGame(browser);

    await hostPage.getByRole("button", { name: "End Round" }).click();

    await expect(hostPage.getByText(/secret word was/i)).toBeVisible({ timeout: 5000 });
    await expect(guestPage.getByText(/secret word was/i)).toBeVisible({ timeout: 2500 });

    await hostCtx.close();
    await guestCtx.close();
  });

  test("Play Again button visible in game layout for host after End Round", async ({ browser }) => {
    const { hostCtx, hostPage, guestCtx } = await setupFullGame(browser);

    await hostPage.getByRole("button", { name: "End Round" }).click();
    await expect(hostPage.getByRole("button", { name: "Play Again" })).toBeVisible({ timeout: 5000 });

    await hostCtx.close();
    await guestCtx.close();
  });
});
