# Quickstart: Room Setup & Lobby

Manual verification steps to confirm the feature works end-to-end after implementation.

## Prerequisites

```bash
# Terminal 1 — backend
cd backend && npm install && npm run dev
# Confirm: http://localhost:3001/health returns {"ok":true}

# Terminal 2 — frontend
cd frontend && npm install && npm run dev
# Confirm: http://localhost:5173 loads the Start screen
```

## Step 1 — Input Validation: Create Room

1. Open `http://localhost:5173` and click **Create Room**
2. Leave Player name empty and click **Create and Continue**
3. **Expected**: Error "Player name is required" appears inline; no navigation occurs
4. Enter only spaces (`"   "`) and click **Create and Continue**
5. **Expected**: Same error; no navigation
6. Enter `"Alice"` and click **Create and Continue**
7. **Expected**: Navigates to `/lobby`; lobby shows "Alice" in the participant list

## Step 2 — Input Validation: Join Room

1. From the Start screen, click **Join Room**
2. Leave both fields empty, click **Join Lobby**
3. **Expected**: Error "Player name is required" appears; no navigation
4. Enter `"Bob"` for player name, leave room code empty, click **Join Lobby**
5. **Expected**: Error "Room code is required" appears; no navigation
6. Enter `"ZZZZ"` (non-existent code) with a valid name, click **Join Lobby**
7. **Expected**: Error from server ("Unable to join room"); no navigation
8. Enter the actual room code from Step 1 with name `"Bob"`, click **Join Lobby**
9. **Expected**: Navigates to `/lobby`

## Step 3 — Host-Only Start Game Button

After completing Steps 1 and 2 (two browser tabs open):

1. **Tab A (Alice — host)**: Verify "Start Game" button is visible
2. **Tab B (Bob — guest)**: Verify "Start Game" button is NOT visible
3. Back in **Tab A**: Observe "Start Game" is disabled (only Alice present initially)
4. Wait for the lobby to auto-refresh after Bob joins — "Start Game" should become enabled
5. Click the enabled "Start Game" button in Tab A
6. **Expected**: Nothing happens — no navigation, no error (intentional no-op for this feature)

## Step 4 — Automatic Polling

Using the same two tabs from Step 2:

1. In **Tab A** (Alice's lobby), do NOT click Refresh
2. Open a new **Tab C**, join the same room with name `"Carol"`
3. Watch **Tab A** — within 2 seconds, "Carol" should appear in the participant list without any manual action
4. **Expected**: "Carol" appears automatically; "Start Game" remains enabled (≥2 players)

## Step 5 — Room Isolation

1. Open `http://localhost:5173` in a new tab, create a second room with name `"Dave"`
2. Note the different room code
3. Verify Dave's lobby shows only Dave — Alice, Bob, and Carol are NOT visible
4. **Expected**: Rooms are completely isolated

## Step 6 — Run Tests

```bash
# Unit + integration tests
cd backend && npm test
cd frontend && npm test

# E2E tests (requires Playwright installed)
cd frontend && npx playwright test
```

**Expected**: All tests pass with no failures.
