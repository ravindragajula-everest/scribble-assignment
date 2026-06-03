# Quickstart: Game Start & Drawer Flow

Manual verification steps after implementation.

## Prerequisites

Both servers running:
```bash
cd backend && npm run dev   # localhost:3001
cd frontend && npm run dev  # localhost:5173
```

## Step 1 — Start Game and Reach Game Screen (Host)

1. Open `http://localhost:5173`, click **Create Room**, enter name "Alice", continue to Lobby
2. Open a second tab, click **Join Room**, enter name "Bob" and the room code, continue to Lobby
3. In **Alice's tab**: "Start Game" button is visible and enabled (2 players present)
4. Click **Start Game**
5. **Expected**: Alice is navigated to the Game screen (`/game`)
6. **Expected**: Alice sees "Role: Drawer" and "Secret Word: rocket"
7. **Expected**: Alice sees "Drawer: Alice" (her own name)

## Step 2 — Non-Host Auto-Navigate

1. After Step 1, check **Bob's tab** (still on Lobby)
2. **Expected**: Within 2 seconds, Bob is automatically navigated to `/game`
3. **Expected**: Bob sees "Role: Guesser" and "Drawer: Alice"
4. **Expected**: Bob does NOT see "rocket" anywhere on the page

## Step 3 — Word Secrecy Verification

1. Open browser DevTools in **Bob's tab** → Network tab
2. Reload the page to force a fresh snapshot request
3. Find the GET /rooms/:code request
4. Inspect the response body — verify `word` key is **absent** from the JSON

## Step 4 — Duplicate Start Error

1. Open the API directly: `POST http://localhost:3001/rooms/:code/start` with the host's participantId
2. Send the same request twice
3. **Expected**: First request returns 200. Second request returns 409 "Game already started"
4. Alternatively: navigate Alice back to `/lobby` (if possible) and click Start Game again
   → verify inline error appears below the button

## Step 5 — Pre-Game Redirect Guard

1. With a room in "lobby" status (before starting), open `http://localhost:5173/game` directly in a new tab that already has the room in session
2. **Expected**: Immediately redirected to `/lobby`
3. Open `http://localhost:5173/game` in a completely fresh browser tab (no room in session)
4. **Expected**: Immediately redirected to `/` (home)

## Step 6 — Run Tests

```bash
# Unit + integration
cd backend && npm test

# Frontend unit
cd frontend && npm test

# E2E (game screen scenarios)
cd frontend && npx playwright test game.spec.ts

# Full suite
cd frontend && npx playwright test
```

**Expected**: All tests pass with zero failures.
