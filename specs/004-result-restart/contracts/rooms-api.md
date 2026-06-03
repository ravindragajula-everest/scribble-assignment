# API Contract: Rooms (feature 004 additions)

**Feature**: 004-result-restart
**Date**: 2026-06-02

## Updated Shared Types

```ts
// RoomStatus now includes "result"
type RoomStatus = "lobby" | "in_game" | "result";

// RoomSnapshot — in result status:
// - word is present for ALL viewers (not filtered)
// - drawerParticipantId is present (same as in_game)
// - guesses[] and strokes[] are present (not cleared until restart)
// - participant scores reflect final scores from the round
```

---

## NEW: POST /api/rooms/:code/end — End the Round

**Host manually ends the round, transitioning to result state.**

### Request

```
POST /api/rooms/ABCD/end
Content-Type: application/json

{ "participantId": "550e8400-..." }
```

### Responses

**200 OK** — round ended:
```json
{
  "room": {
    "code": "ABCD",
    "status": "result",
    "word": "rocket",
    "participants": [{ "id": "...", "name": "Alice", "score": 0 }, { "id": "...", "name": "Bob", "score": 100 }],
    "guesses": [...],
    "strokes": [...],
    "isHost": true
  }
}
```

> **Note**: In result status, `word` is included for ALL viewers (both host and guests).

**403 Forbidden** — caller is not the host:
```json
{ "message": "Only the host can end the round" }
```

**404 Not Found** — room not found:
```json
{ "message": "Room not found" }
```

**409 Conflict** — room is not in `in_game` status:
```json
{ "message": "Game is not in progress" }
```

---

## NEW: POST /api/rooms/:code/restart — Restart the Game

**Host restarts the game, returning all players to lobby with round state cleared.**

### Request

```
POST /api/rooms/ABCD/restart
Content-Type: application/json

{ "participantId": "550e8400-..." }
```

### Responses

**200 OK** — game restarted:
```json
{
  "room": {
    "code": "ABCD",
    "status": "lobby",
    "participants": [
      { "id": "550e...", "name": "Alice", "score": 0, "joinedAt": "..." },
      { "id": "6ba7...", "name": "Bob",   "score": 0, "joinedAt": "..." }
    ],
    "guesses": [],
    "strokes": [],
    "isHost": true
  }
}
```

> **Note**: All round state is cleared. Scores reset to 0. Participants preserved.

**403 Forbidden** — caller is not the host:
```json
{ "message": "Only the host can restart the game" }
```

**404 Not Found** — room not found:
```json
{ "message": "Room not found" }
```

**409 Conflict** — room is not in `result` status:
```json
{ "message": "Round has not ended yet" }
```
