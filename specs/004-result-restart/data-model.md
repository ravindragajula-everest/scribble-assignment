# Data Model: Result, Restart & Final Validation

**Feature**: 004-result-restart
**Date**: 2026-06-02

## Changed Entities

### `RoomStatus` (type — backend + frontend)

| Value | Change | Notes |
|-------|--------|-------|
| `"lobby"` | Unchanged | |
| `"in_game"` | Unchanged | |
| `"result"` | **NEW** | Set by `endRound()`; cleared (back to lobby) by `restartGame()` |

---

## State Transitions

```
"lobby"
  → (host clicks Start Game)
"in_game"
  → (host clicks End Round)
"result"
  → (host clicks Play Again / Restart)
"lobby"   ← players preserved, round state cleared, scores = 0
```

---

## `endRound` Logic

```
Input: code, participantId (host's ID)

1. Find room by code → 404 if missing
2. Check room.status === "in_game" → 409 if not
3. Check participantId === room.hostId → 403 if not host
4. Set room.status = "result"
5. Return { room: cloneRoom(room) }
```

---

## `restartGame` Logic

```
Input: code, participantId (host's ID)

1. Find room by code → 404 if missing
2. Check room.status === "result" → 409 if not
3. Check participantId === room.hostId → 403 if not host
4. Set room.status = "lobby"
5. Clear round state:
   - room.word = undefined
   - room.drawerParticipantId = undefined
   - room.guesses = []
   - room.strokes = []
   - room.participants.forEach(p => p.score = 0)
6. Return { room: cloneRoom(room) }
```

---

## `toRoomSnapshot` Updates

```
showWord = (room.status === "result") || (status === "in_game" && viewer === drawerParticipantId)

drawerParticipantId included in snapshot when status is "in_game" OR "result"
(not in "lobby" where it is undefined)
```

---

## Invariants

1. `room.status` follows the strict sequence: lobby → in_game → result → lobby.
2. `endRound` only transitions from `in_game`; `restartGame` only from `result`.
3. All round-specific fields (`word`, `drawerParticipantId`, `guesses`, `strokes`, scores)
   are cleared atomically in `restartGame()`.
4. `room.hostId` and participant membership never change during a session.
5. In `"result"` status, `word` is included in ALL viewer snapshots (no filtering).
