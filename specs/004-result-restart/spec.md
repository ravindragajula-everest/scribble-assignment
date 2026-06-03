# Feature Specification: Result, Restart & Final Validation

**Feature Branch**: `004-result-restart`
**Created**: 2026-06-02
**Status**: Draft

## What Already Exists (do not re-implement)

- Room statuses: `"lobby"` and `"in_game"` (both already implemented)
- GamePage with canvas, guess form, scoreboard, result panel placeholders
- 2-second polling on GamePage and LobbyPage
- `isHost: boolean`, `guesses[]`, `strokes[]`, `participants` with scores in `RoomSnapshot`
- Existing host-only controls: "Start Game" (feature 002)

## Clarifications

### Session 2026-06-02

- Q: When the host restarts, should participant scores reset to 0 or carry over from the previous round? → A: Reset to 0 — fresh clean game each restart. "All round state cleared" includes scores; multi-round cumulative scoring is out of scope per constitution.
- Q: Should End Round show a separate "Round Over" result section, or reveal information inline in the existing game layout? → A: Inline — no separate result section. The existing Activity panel (guess history) reveals ✓/✗ indicators and the Scoreboard reveals actual scores only when status = "result". Page layout remains the same.
- Q: Are ✓/✗ correctness indicators and scores (100 pts) visible during active gameplay? → A: No — during in_game, the Activity panel shows guess text WITHOUT ✓/✗, and all scores show as hidden (not yet revealed). Both are revealed when the host clicks End Round (status transitions to result).
- Q: What should the "Exit Game" button do? → A: Triggers a backend reset to lobby (preserve players, clear all round state) for the host. Only the host can trigger this; guessers clicking Exit Game navigate to /lobby locally without affecting game state. Works from both in_game and result status.
- Q: Should the "Exit Game" button be visible to guessers (non-host players)? → A: No — "Exit Game" is visible ONLY to the host. Guessers have no Exit Game button on the Game screen.

## Gap Analysis (from user description)

The following gaps were identified and resolved with reasonable defaults:

- **How do non-host players see the result?** — Via the existing 2-second polling. When polling returns `status: "result"`, players stay on the GamePage but it renders the result view. No separate navigation needed.
- **What if host tries to end an already-ended round?** — Returns a 409 Conflict error, consistent with other state-transition endpoints.
- **No separate result screen** — the existing game layout stays unchanged. When status becomes "result", the Activity panel reveals ✓/✗ indicators and the Scoreboard reveals actual scores. The canvas, guess form, and player info remain visible.
- **Participant scores on restart** — reset to 0 (clarified Q1 above).

## User Scenarios & Testing

### User Story 1 — Host Ends the Round (Priority: P1)

The host (drawer) can click an "End Round" button on the Game screen to manually close the current round. The room transitions to a result state. All players — including guessers who haven't yet submitted a guess — see the result view within one polling cycle.

**Why this priority**: Without host-controlled round ending, the game has no defined exit point. This is the entry gate to all result and restart functionality.

**Independent Test**: Host clicks "End Round". Host immediately sees the result view. Within 2 seconds, all guessers' screens also transition to the result view without any manual action.

**Acceptance Scenarios**:

1. **Given** the game is in progress, **When** the host clicks "End Round", **Then** the room transitions to result status immediately.
2. **Given** the room is in result status, **When** any player views the Game screen, **Then** they see the result view (not the active drawing/guessing view).
3. **Given** a guesser is on the Game screen and has not submitted a guess, **When** the host ends the round, **Then** within one polling cycle (~2 seconds) the guesser's screen transitions to the result view without manual action.
4. **Given** the current user is NOT the host, **When** they view the Game screen, **Then** no "End Round" button is rendered.

---

### User Story 2 — Result State Shows All Round Data (Priority: P1)

When the host ends the round, the existing game layout reveals additional information inline — no separate section or screen is shown. The Activity panel (guess history) reveals ✓/✗ correctness indicators for each guess, the Scoreboard reveals actual participant scores, and the secret word becomes visible to all players. During gameplay (before End Round), these are all hidden.

**Why this priority**: The result state is the payoff of the round. Without it, players receive no closure — they cannot verify the correct answer or see who scored highest.

**Independent Test**: During active gameplay, guesser's screen shows guess text WITHOUT ✓/✗ and scores show as hidden. After host clicks End Round, the same game screen now shows ✓/✗ on all guesses, reveals actual scores, and shows "rocket" to all players.

**Acceptance Scenarios**:

1. **Given** the game is in active gameplay (in_game), **When** any player views the Activity panel, **Then** each guess entry shows only the guesser's name and submitted text — NO ✓/✗ indicator is shown.
2. **Given** the game is in active gameplay (in_game), **When** any player views the Scoreboard, **Then** all participant scores are hidden (not displayed).
3. **Given** the round has ended (result status), **When** any player views the Activity panel, **Then** each guess entry shows the guesser's name, submitted text, AND the ✓/✗ correctness indicator.
4. **Given** the round has ended, **When** any player views the Scoreboard, **Then** all actual participant scores are revealed (100 for correct guessers, 0 for others).
5. **Given** the round has ended, **When** any player views the Game screen, **Then** the secret word "rocket" is displayed to all players including guessers who could not see it during gameplay.

---

### User Story 3 — Host Restarts the Game (Priority: P1)

The host can click "Play Again" (result status) or "Exit Game" (any active status) to return all players to the lobby. All round state is cleared, but participants remain in the room.

**Why this priority**: Without restart/exit, the round is permanently over. Players must leave and rejoin manually, which breaks the game flow.

**Independent Test**: Host clicks "Play Again" from the result view (inline in game layout). Host navigates to the lobby. Within 2 seconds, all guessers also navigate to the lobby. The lobby shows all original participants with scores reset to 0.

**Acceptance Scenarios**:

1. **Given** the round is in result status, **When** the host clicks "Play Again", **Then** the room transitions back to lobby status and all round state is cleared.
2. **Given** the host clicked "Play Again", **When** any player's screen refreshes (within one polling cycle), **Then** they navigate to the Lobby screen.
3. **Given** the restart is complete, **When** any player views the Lobby, **Then** all original participants are still listed with their names.
4. **Given** the restart is complete, **When** the host views the Lobby, **Then** the "Start Game" button is visible (ready for a new round).
5. **Given** the current user is NOT the host, **When** they view the result view, **Then** no "Play Again" button is rendered.
6. **Given** the host clicks "Exit Game" during active gameplay (in_game or result), **When** the action completes, **Then** the room returns to lobby status with participants preserved and all round state cleared. All players navigate to the Lobby within one polling cycle.

---

### Edge Cases

- Only the host can end the round — clicking "End Round" by a non-host returns an error (server-enforced, not just UI).
- Only the host can restart (Play Again) or exit (Exit Game host action) — same enforcement as above.
- If the host tries to end a round that is already in result status, the server returns a 409 Conflict error.
- If the host tries to "Play Again" (restart) when not in result status, the server returns a 409 Conflict error.
- "Exit Game" is visible ONLY to the host. Non-hosts have no exit mechanism — they remain on the Game screen until the host ends the round or exits.
- "Exit Game" host action works from both `in_game` and `result` status — it combines exit and reset atomically.
- During gameplay, ✓/✗ indicators and scores are deliberately hidden even if the data is available — this is a frontend-only reveal gate tied to `room.status`.
- A player who refreshes their browser mid-result-state re-loads the session from their last stored `participantId`. If `participantId` is lost, they are treated as a new participant on rejoin — this is a known limitation from feature 001.

## Requirements

### Functional Requirements

- **FR-001**: The Game screen MUST display an "End Round" button visible only to the host when the room is in `in_game` status.
- **FR-002**: When the host clicks "End Round", the system MUST transition the room to result status.
- **FR-003**: The "End Round" endpoint MUST reject requests from non-hosts with a 403 Forbidden response.
- **FR-004**: The "End Round" endpoint MUST reject requests if the room is not in `in_game` status with a 409 Conflict response.
- **FR-005**: When the room is in result status, the room snapshot MUST include the secret word visible to ALL players (not filtered by viewer identity as it is during gameplay).
- **FR-006a**: During `in_game` status, the Activity panel (guess history) MUST display each guess entry showing only the guesser's name and submitted text — WITHOUT any ✓/✗ correctness indicator.
- **FR-006b**: During `in_game` status, the Scoreboard MUST NOT display actual participant scores. All scores are hidden until End Round.
- **FR-006c**: When the room transitions to result status, the Activity panel MUST reveal the ✓/✗ correctness indicator for each guess entry. The Scoreboard MUST reveal actual participant scores (100 for correct guessers, 0 for others).
- **FR-006d**: When the room is in result status, the secret word MUST be displayed on the Game screen for ALL players (drawer and guessers). No separate result section is shown — the existing game layout reveals this information inline.
- **FR-007**: The Game screen in result status MUST display a "Play Again" button visible only to the host. This button appears within the existing game layout.
- **FR-007a**: The Game screen in result status MUST display an "End Round" button — this button is removed and replaced by "Play Again" once status = "result". "End Round" is only visible when status = "in_game".
- **FR-008**: When the host clicks "Play Again", the system MUST transition the room back to lobby status and clear all round state: guesses, canvas strokes, secret word, and drawer assignment.
- **FR-009**: On restart (Play Again), all participant scores MUST be reset to 0. This is intentional — each restart begins a fresh round with clean scores.
- **FR-010**: The "Play Again" endpoint MUST reject requests from non-hosts with a 403 Forbidden response.
- **FR-011**: The "Play Again" endpoint MUST reject requests if the room is not in result status with a 409 Conflict response.
- **FR-012**: Non-host players on the Game screen MUST detect the result state transition via the existing 2-second polling within one polling cycle (~2s) — the game layout updates in-place (no navigation).
- **FR-013**: All players MUST detect the restart transition via polling and navigate to the Lobby screen within one polling cycle (~2s) after the host clicks "Play Again".
- **FR-014**: The "Exit Game" button MUST be visible ONLY to the host. When clicked, it calls a backend endpoint that resets the room to lobby status (preserve participants, clear all round state) from either `in_game` or `result` status. This endpoint is host-only (403 for non-hosts). Non-host players do NOT see the "Exit Game" button.

### Key Entities

- **Room**: Gains `"result"` as a new valid status value. On restart, `status` returns to `"lobby"`, `guesses` resets to `[]`, `strokes` resets to `[]`, `word` clears, `drawerParticipantId` clears, and all participant `score` values reset to 0.
- **RoomSnapshot**: When `status === "result"`, the `word` field is included for ALL viewers (not filtered). All other snapshot fields unchanged.
- **Participant**: `score` resets to 0 on restart — each restart is a fresh game.

## Success Criteria

### Measurable Outcomes

- **SC-001**: After the host ends the round, all connected players see ✓/✗ on their guess entries and actual scores on the scoreboard within one polling cycle (~2 seconds) — without any manual action.
- **SC-002**: During active gameplay (before End Round), 100% of player screens show guess text WITHOUT ✓/✗ indicators and show no score values on the scoreboard.
- **SC-003**: After the host ends the round (result status), 100% of player screens show the secret word "rocket", ✓/✗ indicators on all guesses, and actual scores (100 for correct, 0 for others).
- **SC-004**: After the host clicks "Play Again" or "Exit Game" (host action), all players navigate to the Lobby screen within one polling cycle (~2 seconds). The lobby participant list is unchanged.
- **SC-005**: Attempting to end a round when not in `in_game` status, or restart when not in `result` status, returns a visible error without navigating away or crashing.
- **SC-006**: Non-host attempts to end the round or restart are blocked — the "End Round" and "Play Again" buttons are absent from non-host views in 100% of tested scenarios.

## Assumptions

- "Player" and "participant" are interchangeable; "host" = room creator = drawer.
- The secret word is always "rocket" (set deterministically in feature 002). In result status, "rocket" is shown to all.
- The result state is displayed within the existing GamePage using conditional rendering based on `room.status`. No separate `/result` route is needed.
- Participants' names and membership are preserved on restart — only round-specific state is cleared.
- All round state cleared on restart includes: `guesses`, `strokes`, `word`, `drawerParticipantId`. Room `code`, `hostId`, and `participants` (identities) are preserved.
- The host is still the host after restart — `hostId` does not change.
- Non-host players navigate to `/lobby` after restart via the existing polling detecting `status: "lobby"`.

## Out of Scope

- Round timers, countdowns, or automatic round ending (host always ends manually)
- Multiple rounds with cumulative leaderboards
- Drawer rotation (host is always the drawer, even after restart)
- Word rotation (secret word is always "rocket" after restart, set again by the start-game flow)
- Spectator mode or new players joining during result state
