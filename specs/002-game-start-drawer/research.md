# Research: Game Start & Drawer Flow

**Feature**: 002-game-start-drawer
**Date**: 2026-06-02
**Status**: Complete — all unknowns resolved from codebase analysis

## Findings

### 1. Optional Fields on Room and RoomSnapshot

**Decision**: `word` and `drawerParticipantId` are `?` (optional) on both `Room` (internal)
and `RoomSnapshot` (API response). They are absent in "lobby" status and present in "in_game".

**Rationale**: Optional fields mean the existing lobby-phase tests (feature 001) continue to
pass without modification — they never set or assert these fields. Making them required would
force every test that creates a room to supply placeholder values.

**Alternatives considered**:
- Required with empty string defaults — rejected: semantically wrong (empty string ≠ "not assigned")
- Separate "in_game" and "lobby" snapshot types — rejected: adds complexity, single type is sufficient

---

### 2. startGame Does Not Use withLoading

**Decision**: `roomStore.startGame()` calls `api.startGame()` directly without the `withLoading`
wrapper. Errors bubble to the LobbyPage caller which sets local `startError` state.

**Rationale**: Follows the `fetchRoom()` pattern which also bypasses `withLoading`. The
`withLoading` wrapper sets global `isLoading: true` which is only appropriate for initial room
creation/join. The "Start Game" error is a local concern of the Lobby button, not a global state.

**Alternatives considered**:
- Use `withLoading` — rejected: `isLoading: true` during game start would show "Refreshing..."
  on the manual Refresh button, which is misleading

---

### 3. Backend Host Verification (403)

**Decision**: `POST /rooms/:code/start` checks `participantId === room.hostId` and returns 403
if the caller is not the host.

**Rationale**: Defence in depth — the UI already restricts the button to the host, but the
backend should not trust the client. 403 Forbidden is the correct status for authorisation
failure. The spec only mandates 409 for wrong status, but host verification is implied by
"the host clicks the button" and is a sensible default per REST conventions.

---

### 4. Fixed Word = STARTER_WORDS[0]

**Decision**: `room.word` is always set to `STARTER_WORDS[0]` which is `"rocket"`.

**Rationale**: The spec requires deterministic selection from the starter list for a single
round. Index 0 is the simplest deterministic rule. No randomness, no state needed to track
which word was used.

---

### 5. Non-Host Auto-Navigate via Existing Polling

**Decision**: LobbyPage's existing 2-second `setInterval` polling (`fetchRoom()`) detects the
`status: "in_game"` transition. A new condition is added to the existing redirect `useEffect`
that checks `room.status === "in_game"` → `navigate("/game")`.

**Rationale**: No new polling mechanism required. Feature 001 already implemented the 2-second
interval with cleanup. Adding one `else if` branch to the existing useEffect is the minimum
change that satisfies FR-007 (auto-navigate within one polling cycle).

---

### 6. Game Screen Word Secrecy via Server-Side Filtering

**Decision**: `toRoomSnapshot` only includes `word` in the response when
`viewerParticipantId === room.drawerParticipantId`. Guessers' snapshots never contain `word`.

**Rationale**: Server-side filtering is the only safe approach — client-side hiding is trivially
bypassed by reading the API response. The existing `viewerParticipantId` parameter in
`toRoomSnapshot` was designed for exactly this kind of per-viewer computation.
