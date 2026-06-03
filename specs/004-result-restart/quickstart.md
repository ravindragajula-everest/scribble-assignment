# Quickstart: Result, Restart & Final Validation

Manual verification after implementation.

## Prerequisites

Both servers running:
```bash
cd backend && npm run dev    # localhost:3001
cd frontend && npm run dev   # localhost:5173
```

## Step 1 — Set Up a Full Game

1. Tab A: Create room as "Alice" → Lobby
2. Tab B: Join as "Bob" → Lobby
3. Tab A: Click "Start Game" → Game screen
4. Tab B (Bob): Guess "rocket" → score shows 100

## Step 1b — Verify Deferred Reveal During Gameplay

1. Tab B (Bob): Submit a guess "pizza" → guess appears in Activity as "Bob: pizza" WITHOUT ✓/✗
2. Tab A (Alice — host): Activity also shows "Bob: pizza" WITHOUT ✓/✗ via polling
3. Scoreboard on BOTH tabs shows "—" for all scores (not 0 and not 100)
4. Alice's scoreboard shows "—" for Alice and Bob

## Step 2 — End the Round

1. Tab A (Alice — host): Confirm "End Round" button is visible
2. Tab B (Bob): Confirm "End Round" button is NOT visible
3. Tab A: Click "End Round"
4. **Expected (Tab A)**: ✓/✗ indicators NOW appear on all guesses in Activity; Scoreboard reveals actual scores (Alice: 0, Bob: 0 since "pizza" was incorrect); word "rocket" appears in the game layout
5. **Expected (Tab B)**: Within 2 seconds, same reveal happens: ✓/✗ visible, scores visible, "rocket" visible — without any modal or separate screen

## Step 3 — Verify Result Content

1. Both tabs should show: "The secret word was: rocket"
2. Both tabs should show Bob with score 100, Alice with score 0
3. Both tabs should show the complete guess history
4. Tab A: "Play Again" button visible
5. Tab B: "Play Again" button NOT visible

## Step 4 — Restart the Game

1. Tab A (Alice): Click "Play Again"
2. **Expected (Tab A)**: Navigates to Lobby immediately
3. **Expected (Tab B)**: Within 2 seconds, navigates to Lobby without manual action
4. Lobby shows Alice and Bob, both with score 0

## Step 5 — Verify Reset State

1. Lobby shows both players preserved (names unchanged)
2. Both players show score 0 in the lobby (if scores are displayed)
3. Tab A: "Start Game" button enabled (can start a new round)

## Step 6 — Run Tests

```bash
cd backend && npm test
cd frontend && npm test
cd frontend && npx playwright test result.spec.ts
cd frontend && npx playwright test   # full suite
```

**Expected**: All tests pass with zero failures.
