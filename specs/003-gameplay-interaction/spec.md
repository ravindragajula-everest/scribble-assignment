# Feature Specification: Gameplay Interaction

**Feature Branch**: `003-gameplay-interaction`
**Created**: 2026-06-02
**Status**: Draft

## What Already Exists (do not re-implement)

- Game screen (`GamePage`) with placeholder canvas div, `GuessForm` placeholder, `Scoreboard` placeholder, `ResultPanel` placeholder
- Room in `"in_game"` status with `drawerParticipantId` and `word` assigned
- `isHost: boolean` in `RoomSnapshot` — drawer identity per viewer
- 2-second polling in `LobbyPage` (already implemented); the same pattern applies to the `GamePage` polling needed here
- Participant list with names

## User Scenarios & Testing

### User Story 1 — Drawer Draws on Interactive Canvas (Priority: P1)

The host (drawer) sees a real interactive canvas on the Game screen. They can draw freely using the mouse (click and drag). Each completed stroke (mouseup) is sent to the server. Guessers see the drawer's strokes appear on their own canvas within one polling cycle (~2 seconds).

**Why this priority**: The canvas interaction is the core mechanic of the game. Without a working canvas — visible to BOTH drawer and guessers — the round cannot proceed.

**Independent Test**: Drawer draws in Tab A. Within 2 seconds, Tab B (guesser) shows the same strokes on their canvas without any manual action.

**Acceptance Scenarios**:

1. **Given** the game has started and the current player is the drawer, **When** the Game screen loads, **Then** an interactive drawing canvas is visible and focusable.
2. **Given** the drawer presses the mouse button down and moves the mouse across the canvas, **When** the mouse is released, **Then** a continuous stroke is drawn on the drawer's canvas and sent to the server.
3. **Given** the drawer has sent strokes to the server, **When** the next polling cycle fires for a guesser, **Then** those strokes appear on the guesser's canvas within one polling cycle (~2 seconds).
4. **Given** the drawer has drawn strokes, **When** they draw additional strokes, **Then** all strokes accumulate on all players' canvases until cleared.

---

### User Story 2 — Drawer Clears the Canvas (Priority: P1)

The drawer has a "Clear Canvas" button that clears the drawing server-side. This causes all players' canvases to be blank within one polling cycle. Only the drawer sees and can use this button.

**Why this priority**: Clearing is a fundamental part of the drawing workflow — the drawer must be able to start over, and all players must see the cleared state.

**Independent Test**: Drawer draws strokes → Tab B (guesser) shows the strokes within 2s. Drawer clicks "Clear Canvas" → within 2s, Tab B canvas is also blank. Guesser has no "Clear Canvas" button.

**Acceptance Scenarios**:

1. **Given** the current user is the drawer, **When** they view the Game screen, **Then** a "Clear Canvas" button is visible.
2. **Given** the drawer has drawn strokes, **When** they click "Clear Canvas", **Then** all strokes are removed from the drawer's canvas AND from the server. Within the next polling cycle, all guessers' canvases also become blank.
3. **Given** the current user is a guesser, **When** they view the Game screen, **Then** no "Clear Canvas" button is rendered.

---

### User Story 3 — Guesser Submits a Guess (Priority: P1)

Non-host players (guessers) can type a word into the guess input and submit it. The guess is trimmed of whitespace before comparison. Empty or whitespace-only submissions are rejected with an inline error. The submitted text is compared case-insensitively against the secret word.

**Why this priority**: Guess submission is the guessers' primary interaction. Without it the round is one-sided.

**Independent Test**: Guesser submits "  ROCKET  " → system trims to "rocket", matches the secret word "rocket" → guess recorded as correct. Guesser submits "  " (whitespace only) → error "Guess cannot be empty" shown, no submission recorded.

**Acceptance Scenarios**:

1. **Given** the current user is a guesser, **When** the Game screen loads, **Then** the guess input field and a "Submit Guess" button are visible and interactive.
2. **Given** the guesser types whitespace only and clicks "Submit Guess", **Then** an inline error "Guess cannot be empty" is shown and no guess is recorded.
3. **Given** the guesser types "  ROCKET  " and clicks "Submit Guess", **Then** the text is trimmed to "rocket", compared case-insensitively to the secret word "rocket", and recorded as a **correct** guess.
4. **Given** the guesser types "pizza" and the secret word is "rocket", **When** they submit, **Then** the guess is recorded as an **incorrect** guess.
5. **Given** the guesser is the drawer (host), **When** they view the Game screen, **Then** no guess input or "Submit Guess" button is rendered.

---

### User Story 4 — Guess History Synced to All Players (Priority: P1)

All players (drawer and guessers) see the running guess history updated every 2 seconds via polling. Each entry shows the guesser's name, their submitted text, and whether it was correct or incorrect.

**Why this priority**: Without shared guess history, guessers can't see whether others have already found the word, and the drawer can't follow the game progress.

**Independent Test**: Guesser submits a guess from Tab B. Within 2 seconds, Tab A (drawer) and Tab C (another guesser) show the new guess in the history list without any manual action.

**Acceptance Scenarios**:

1. **Given** a guesser submits a guess, **When** 2 seconds elapse, **Then** the guess appears in the guess history visible to all players (drawer and other guessers).
2. **Given** a guess history entry shows a correct guess, **Then** it is visually distinguished from incorrect guesses (e.g., by label or styling).
3. **Given** the Game screen is open for any player, **When** polling fires, **Then** the guess history is refreshed without any manual action.

---

### User Story 5 — Scoring Updates After Each Guess (Priority: P1)

Each player's score is shown in the scoreboard. A correct guess awards 100 points to the guesser who submitted it. An incorrect guess awards 0 points. The scoreboard is updated via the same 2-second polling cycle.

**Why this priority**: Scoring gives the round meaning and drives the competitive aspect of the game.

**Independent Test**: All scores start at 0. Guesser submits "rocket" (correct) → their score becomes 100. Another guesser submits "pizza" (incorrect) → their score stays 0. Scoreboard reflects these values within one polling cycle.

**Acceptance Scenarios**:

1. **Given** the game has started, **When** any player views the scoreboard, **Then** all participants are listed with their current score (0 at round start).
2. **Given** a guesser submits a correct guess, **When** the next polling cycle fires, **Then** their score in the scoreboard increases by 100.
3. **Given** a guesser submits an incorrect guess, **When** the next polling cycle fires, **Then** their score remains unchanged (adds 0).
4. **Given** a guesser has already guessed correctly, **When** they submit another guess, **Then** the guess is still recorded and checked, and scoring applies normally (additional correct guesses continue to award 100).

---

### Edge Cases

- Submitting a guess with only whitespace (e.g., `"   "`) is rejected with "Guess cannot be empty" before any API call is made.
- Guest field input is trimmed before comparison but the original trimmed text is stored in guess history (not raw untrimmed input).
- Scores are non-negative and start at 0 for every participant at game start.
- The drawer (host) cannot submit guesses — the guess form is hidden from them.
- Multiple guessers can submit the same correct answer; each correct guess independently awards 100 to that guesser.
- Each completed stroke (mouseup) is submitted to the server. The server stores all strokes for the round. Guessers receive all strokes via the 2-second polling cycle and re-render them on their canvas.
- Canvas clearing removes all stored strokes from the server. All players' canvases are blank within one polling cycle after a clear.

## Requirements

### Functional Requirements

- **FR-001**: The Game screen MUST render an interactive drawing canvas visible only when the current user is the drawer.
- **FR-002**: The drawer MUST be able to draw continuous freehand strokes on the canvas by clicking and dragging the mouse.
- **FR-003**: The Game screen MUST render a "Clear Canvas" button visible only to the drawer; clicking it MUST delete all stored strokes on the server and reset the drawer's canvas to blank immediately. All other players' canvases MUST become blank within the next polling cycle.
- **FR-004**: The guess input field and "Submit Guess" button MUST be visible and interactive only for guessers (non-host players). They MUST NOT be rendered for the drawer.
- **FR-005**: The guess form MUST reject submission if the trimmed guess text is empty, displaying "Guess cannot be empty" inline. No API call is made on rejection.
- **FR-006**: Before recording, the system MUST trim whitespace from the submitted guess text.
- **FR-007**: Guess comparison against the secret word MUST be case-insensitive (e.g., "ROCKET", "Rocket", and "rocket" all match "rocket").
- **FR-008**: A correct guess MUST award 100 points to the guesser; an incorrect guess MUST award 0 points.
- **FR-009**: All submitted guesses (correct and incorrect) MUST be stored in the room's guess history with: guesser's name, the full submitted text (trimmed), and a correctness indicator. The submitted text is always visible to all players — it is NOT hidden for correct guesses.
- **FR-010**: The game polling cycle MUST refresh the guess history and participant scores for all players every 2 seconds on the Game screen without manual action.
- **FR-010a**: After a guesser's submission succeeds, their own guess MUST appear in the guess history immediately (before the next polling cycle). Polling syncs all other players' guesses.
- **FR-011**: The scoreboard on the Game screen MUST display all participants with their current scores, updated via polling.
- **FR-012**: Each completed stroke (one mousedown-to-mouseup movement) MUST be submitted to the server immediately after the mouse is released. The server stores all strokes for the active round.
- **FR-013**: The room snapshot MUST include all stored canvas strokes so that all players render an identical canvas. Guessers' canvases MUST update to show the drawer's strokes within one polling cycle (~2 seconds).
- **FR-014**: "Clear Canvas" MUST delete all stored strokes from the server in addition to clearing the drawer's local canvas. Guessers detect the cleared state via polling and blank their own canvases.

### Key Entities

- **Guess**: A single submitted guess. Fields: `id: string`, `participantId: string`, `participantName: string`, `text: string` (trimmed), `isCorrect: boolean`, `timestamp: string`.
- **Stroke**: A completed freehand path. Fields: `id: string`, `points: {x: number, y: number}[]` (all mouse positions in the stroke), `color: string` (default `"#1e1e1e"`), `lineWidth: number` (default `3`).
- **Guess**: A single submitted guess. Fields: `id: string`, `participantId: string`, `participantName: string`, `text: string` (trimmed), `isCorrect: boolean`, `timestamp: string`.
- **Room**: Gains `guesses: Guess[]` and `strokes: Stroke[]` (all strokes for the current round; cleared on demand).
- **Participant**: Gains `score: number` (starts at 0; incremented by 100 on correct guess).
- **RoomSnapshot**: Gains `guesses: Guess[]`, `strokes: Stroke[]`; `participants` now includes `score`.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A guesser's correct submission appears in the guess history of all connected players within one polling cycle (~2 seconds) without any manual action.
- **SC-002**: 100% of whitespace-only submissions are rejected before an API call is made, with "Guess cannot be empty" shown inline.
- **SC-003**: A guesser's score increases by exactly 100 within one polling cycle after a correct guess; incorrect guesses leave the score unchanged.
- **SC-004**: The "Clear Canvas" button and interactive drawing canvas are absent from the guesser's view in 100% of tested scenarios. Guessers see a read-only canvas showing the drawer's strokes.
- **SC-006**: A stroke drawn by the drawer appears on the guesser's canvas within one polling cycle (~2 seconds) without any manual action.
- **SC-007**: After the drawer clicks "Clear Canvas", all guessers' canvases are blank within one polling cycle (~2 seconds).
- **SC-005**: The guess form and "Submit Guess" button are absent from the drawer's view in 100% of tested scenarios.

## Assumptions

- "Player" and "participant" are interchangeable; "drawer" = host participant; "guesser" = non-host participant.
- Canvas strokes are synced to all players via the 2-second polling cycle. Each completed stroke is sent to the server on mouseup; guessers re-render all strokes on their canvas on each poll.
- All participant scores begin at 0 when the game starts (set during the game-start flow, feature 002).
- Multiple correct guesses from the same guesser each award 100 points independently — there is no "already guessed correctly" cap in this feature scope.
- The existing 2-second polling on the Game screen (which fetches the room snapshot) is the mechanism for syncing guess history and scores.
- Guess text stored in history is the trimmed version, not the raw input.
- The secret word for comparison is always "rocket" (set deterministically in feature 002).

## Clarifications

### Session 2026-06-02

- Q: Is shared result state (end-of-round summary, word reveal, winner) in scope? → A: No — explicitly out of scope. This feature only shows running scores and guess history during an active round.
- Q: Should canvas strokes be visible only on the drawer's screen, or synced to all players? → A: Synced to all players — each completed stroke is sent to the server and delivered to guessers via 2-second polling. FR-012, FR-013, FR-014 and SC-006, SC-007 added. "Canvas stroke synchronization" removed from Out of Scope.
- Q: Should the submitted text be visible for correct guesses in history, or hidden to protect the secret word? → A: Show submitted text for all guesses (correct and incorrect) — simple, consistent display; each entry shows guesser name, submitted text, and correctness indicator.
- Q: After a guesser submits, does their guess appear immediately or only after the next 2-second poll? → A: Immediately — the guesser's own guess is added to local state right after a successful submission; polling syncs everyone else's guesses.

## Out of Scope

- Round end detection (e.g., "all guessers guessed correctly → round over")
- Shared result state visible to all players — no end-of-round summary, word reveal, or winner announcement in this feature scope (next feature)
- Restart flow (next feature)
- Drawer bonuses for being guessed quickly
- Multiple rounds or word rotation
- Spectator mode or kick functionality
