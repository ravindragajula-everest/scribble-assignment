# Quickstart: Gameplay Interaction

Manual verification after implementation.

## Prerequisites

Both servers running:
```bash
cd backend && npm run dev    # localhost:3001
cd frontend && npm run dev   # localhost:5173
```

## Step 1 — Start a Game (prerequisite)

1. Tab A: Create room as "Alice" → Lobby
2. Tab B: Join room as "Bob" → Lobby
3. Tab A (Alice — host): Click "Start Game" → Game screen
4. Wait for Tab B to auto-navigate to Game screen

## Step 2 — Canvas (Alice — Drawer)

1. In Tab A (Alice), confirm an interactive `<canvas>` element is visible
2. Click and drag on the canvas — strokes should appear
3. Click "Clear Canvas" — canvas resets to blank
4. In Tab B (Bob), confirm NO canvas is visible — only the placeholder text

## Step 3 — Guess Submission (Bob — Guesser)

1. In Tab B (Bob), confirm the guess input field and "Submit Guess" button are visible
2. Click "Submit Guess" with empty input → error "Guess cannot be empty" appears inline
3. Type "  PIZZA  " (incorrect) → click "Submit Guess" → guess appears immediately in Bob's history (✗)
4. Bob's score stays at 0
5. Type "  ROCKET  " (correct, mixed case + spaces) → Submit → appears immediately (✓)
6. Bob's score becomes 100 immediately on his screen

## Step 4 — Cross-Player Sync

1. Within 2 seconds, both guesses ("PIZZA ✗", "ROCKET ✓") appear in Tab A (Alice's history)
2. Tab A scoreboard shows: Alice 0, Bob 100

## Step 4b — Canvas Sync (Amended Feature)

1. In Tab A (Alice — drawer), draw strokes on the canvas
2. Within 2 seconds, Tab B (Bob — guesser) should show the same strokes on their canvas
3. In Tab A, click "Clear Canvas"
4. Within 2 seconds, Tab B canvas should be blank

## Step 5 — Drawer Cannot Guess

1. In Tab A (Alice — host/drawer), confirm NO guess input or "Submit Guess" button is visible
2. In Tab B (Bob — guesser), confirm NO "Clear Canvas" button is visible

## Step 6 — Run Tests

```bash
cd backend && npm test
cd frontend && npm test
cd frontend && npx playwright test gameplay.spec.ts
cd frontend && npx playwright test   # full suite
```

**Expected**: All tests pass with zero failures.
