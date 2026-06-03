# Research: Result, Restart & Final Validation

**Feature**: 004-result-restart
**Date**: 2026-06-02
**Status**: Complete — all resolved from codebase analysis

## Findings

### 1. Status Machine Extension — Add "result"

**Decision**: Extend `RoomStatus` to `"lobby" | "in_game" | "result"`.

**Rationale**: The result state is a distinct phase — it follows `in_game` and precedes the
restart back to `lobby`. All existing polling, redirect guards, and snapshot logic operate on
status; adding `"result"` fits naturally into the existing pattern.

**Alternatives considered**:
- Using a separate boolean `isResultState` flag — rejected: inconsistent with the existing
  status-driven architecture used by all redirect effects and conditional rendering.

---

### 2. Word Visibility in Result State

**Decision**: In `toRoomSnapshot()`, include `word` for ALL viewers when `room.status === "result"`.

**Rationale**: Result state is the reveal phase. Keeping word hidden in result would defeat the
purpose of ending the round. The existing `isDrawer` check is supplemented: `showWord = status===
"result" || isDrawer`.

---

### 3. POST for Both /end and /restart

**Decision**: Both use POST — `POST /rooms/:code/end` and `POST /rooms/:code/restart`.

**Rationale**: Both mutate server state (transition between statuses). POST is the correct HTTP
method for state mutations that don't map to CRUD resource operations.

---

### 4. GamePage Guards for "result" Status

**Decision**: Update GamePage redirect effect and guard to allow both `"in_game"` AND `"result"`.

**Rationale**: Players stay on the GamePage throughout the game session, with conditional content
per status. Navigating away on result would disrupt the result-view experience. The same guard
pattern update applies to LobbyPage (to handle edge case redirects).

---

### 5. restartGame Resets Scores to 0

**Decision**: All participant scores reset to 0 in `restartGame()`.

**Rationale**: Clarification Q1 from spec: single-round per constitution; "all round state
cleared" includes scores; fresh clean game.

---

### 6. Strokes Remain in Snapshot During Result

**Decision**: Canvas strokes (`room.strokes`) remain in the snapshot during result state.
They are cleared only on restart.

**Rationale**: The result view is read-only. Showing the stale canvas (the last state of the
drawing) alongside the result is a reasonable UX — it gives context about the round. Strokes
are cleared on restart via `room.strokes = []`.
