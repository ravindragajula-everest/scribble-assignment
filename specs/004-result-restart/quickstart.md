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

## Step 2 — End the Round

1. Tab A (Alice — host): Confirm "End Round" button is visible
2. Tab B (Bob): Confirm "End Round" button is NOT visible
3. Tab A: Click "End Round"
4. **Expected (Tab A)**: Result view appears immediately showing "rocket", Alice's score, Bob's score (100), and all guesses
5. **Expected (Tab B)**: Within 2 seconds, result view appears showing "rocket" to Bob (who couldn't see it during gameplay), plus all scores and guesses

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
