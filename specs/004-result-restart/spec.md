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

## Gap Analysis (from user description)

The following gaps were identified and resolved with reasonable defaults:

- **How do non-host players see the result?** — Via the existing 2-second polling. When polling returns `status: "result"`, players stay on the GamePage but it renders the result view. No separate navigation needed.
- **What if host tries to end an already-ended round?** — Returns a 409 Conflict error, consistent with other state-transition endpoints.
- **Does the result screen replace or extend the GamePage?** — GamePage conditionally renders result content when `room.status === "result"` — no separate route needed.
- **Participant scores on restart** — [NEEDS CLARIFICATION: Q1 below]

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

The result view shows the secret word, final scores, and full guess history to all players — including guessers who could not see the word during gameplay.

**Why this priority**: The result state is the payoff of the round. Without it, players receive no closure — they cannot verify the correct answer or see who scored highest.

**Independent Test**: After the host ends the round, both the host's screen and a guesser's screen show "rocket" (the secret word), all participant scores, and all submitted guesses (correct and incorrect).

**Acceptance Scenarios**:

1. **Given** the round has ended, **When** any player views the result screen, **Then** the secret word is displayed prominently to all players (including guessers who could not see it during gameplay).
2. **Given** the round has ended, **When** any player views the result screen, **Then** all participants are listed with their final scores in the result view.
3. **Given** the round has ended, **When** any player views the result screen, **Then** the full guess history is displayed — showing every submitted guess, who submitted it, whether it was correct, and the guessed text.

---

### User Story 3 — Host Restarts the Game (Priority: P1)

The host can click a "Restart" button from the result screen to return all players to the lobby. All round state is cleared, but participants remain in the room.

**Why this priority**: Without restart, the round is permanently over. Players must leave and rejoin manually, which breaks the game flow.

**Independent Test**: Host clicks "Restart" from the result screen. Host navigates to the lobby. Within 2 seconds, all guessers also navigate to the lobby. The lobby shows all original participants. The game canvas, guesses, and scores are cleared.

**Acceptance Scenarios**:

1. **Given** the round is in result status, **When** the host clicks "Restart", **Then** the room transitions back to lobby status and all round state is cleared.
2. **Given** the host clicked "Restart", **When** any player's screen refreshes (within one polling cycle), **Then** they navigate to the Lobby screen.
3. **Given** the restart is complete, **When** any player views the Lobby, **Then** all original participants are still listed with their names.
4. **Given** the restart is complete, **When** the host views the Lobby, **Then** the "Start Game" button is visible (ready for a new round).
5. **Given** the current user is NOT the host, **When** they view the result screen, **Then** no "Restart" button is rendered.

---

### Edge Cases

- Only the host can end the round — clicking "End Round" by a non-host returns an error (server-enforced, not just UI).
- Only the host can restart — same enforcement as above.
- If the host tries to end a round that is already in result status, the server returns a 409 Conflict error.
- If the host tries to restart a room that is already in lobby status, the server returns a 409 Conflict error.
- A player who refreshes their browser mid-result-state re-loads the session from their last stored `participantId`. If `participantId` is lost, they are treated as a new participant on rejoin — this is a known limitation from feature 001.

## Requirements

### Functional Requirements

- **FR-001**: The Game screen MUST display an "End Round" button visible only to the host when the room is in `in_game` status.
- **FR-002**: When the host clicks "End Round", the system MUST transition the room to result status.
- **FR-003**: The "End Round" endpoint MUST reject requests from non-hosts with a 403 Forbidden response.
- **FR-004**: The "End Round" endpoint MUST reject requests if the room is not in `in_game` status with a 409 Conflict response.
- **FR-005**: When the room is in result status, the room snapshot MUST include the secret word visible to ALL players (not filtered by viewer identity as it is during gameplay).
- **FR-006**: The Game screen in result status MUST display: the secret word, all participant names and final scores, and the complete guess history.
- **FR-007**: The Game screen in result status MUST display a "Restart" button visible only to the host.
- **FR-008**: When the host clicks "Restart", the system MUST transition the room back to lobby status and clear all round state: guesses, canvas strokes, secret word, and drawer assignment.
- **FR-009**: On restart, all participant scores MUST be reset to 0. This is intentional — each restart begins a fresh round with clean scores.
- **FR-010**: The "Restart" endpoint MUST reject requests from non-hosts with a 403 Forbidden response.
- **FR-011**: The "Restart" endpoint MUST reject requests if the room is not in result status with a 409 Conflict response.
- **FR-012**: Non-host players on the Game screen MUST detect the result state transition via the existing 2-second polling and render the result view within one polling cycle.
- **FR-013**: Non-host players in result status MUST detect the restart transition via polling and navigate to the Lobby screen within one polling cycle.

### Key Entities

- **Room**: Gains `"result"` as a new valid status value. On restart, `status` returns to `"lobby"`, `guesses` resets to `[]`, `strokes` resets to `[]`, `word` clears, `drawerParticipantId` clears, and all participant `score` values reset to 0.
- **RoomSnapshot**: When `status === "result"`, the `word` field is included for ALL viewers (not filtered). All other snapshot fields unchanged.
- **Participant**: `score` resets to 0 on restart — each restart is a fresh game.

## Success Criteria

### Measurable Outcomes

- **SC-001**: After the host ends the round, all connected players see the result view within one polling cycle (~2 seconds) without any manual action.
- **SC-002**: 100% of result-state screens across all players display the correct secret word, all participant scores, and the complete guess history.
- **SC-003**: After the host restarts, all players navigate to the Lobby screen within one polling cycle (~2 seconds). The lobby participant list is unchanged.
- **SC-004**: Attempting to end a round when not in `in_game` status, or restart when not in `result` status, returns a visible error without navigating away or crashing.
- **SC-005**: Non-host attempts to end the round or restart are blocked — the "End Round" and "Restart" buttons are absent from non-host views in 100% of tested scenarios.

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
