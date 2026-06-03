# API Contract: Rooms (feature 003 additions)

**Feature**: 003-gameplay-interaction
**Date**: 2026-06-02

This document covers ONLY the additions from feature 003. Prior endpoints documented in
`specs/001-room-setup-lobby/contracts/rooms-api.md` and
`specs/002-game-start-drawer/contracts/rooms-api.md`.

## Updated Shared Types

```ts
// Participant now includes score
interface Participant {
  id: string;
  name: string;
  score: number;    // NEW — always present, 0 at game start
  joinedAt: string;
}

// New entity
interface Guess {
  id: string;
  participantId: string;
  participantName: string;
  text: string;       // trimmed
  isCorrect: boolean;
  timestamp: string;
}

// RoomSnapshot gains guesses
interface RoomSnapshot {
  code: string;
  status: "lobby" | "in_game";
  participants: Participant[];   // now includes score
  availableWords: string[];
  roles: ParticipantRole[];
  isHost: boolean;
  word?: string;
  drawerParticipantId?: string;
  guesses: Guess[];   // NEW — always present (empty in lobby)
}
```

All three existing endpoints now return the updated `RoomSnapshot` including `guesses`
and `score` on each participant.

---

## NEW: POST /api/rooms/:code/guesses — Submit a Guess

**Records a guesser's attempt at the secret word. Drawer cannot submit.**

### Request

```
POST /api/rooms/ABCD/guesses
Content-Type: application/json

{
  "participantId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "text": "  ROCKET  "
}
```

### Request Body

| Field | Type | Validation |
|-------|------|------------|
| `participantId` | string | required; trimmed; min 1 char |
| `text` | string | required; trimmed; min 1 char after trim |

### Responses

**201 Created** — guess recorded:
```json
{
  "guess": {
    "id": "uuid",
    "participantId": "6ba7b810...",
    "participantName": "Bob",
    "text": "ROCKET",
    "isCorrect": true,
    "timestamp": "2026-06-02T10:05:00.000Z"
  },
  "room": {
    "code": "ABCD",
    "status": "in_game",
    "participants": [
      { "id": "550e...", "name": "Alice", "score": 0,   "joinedAt": "..." },
      { "id": "6ba7...", "name": "Bob",   "score": 100, "joinedAt": "..." }
    ],
    "guesses": [
      { "id": "uuid", "participantName": "Bob", "text": "ROCKET", "isCorrect": true, "timestamp": "..." }
    ],
    "isHost": false,
    "drawerParticipantId": "550e..."
  }
}
```

**400 Bad Request** — blank or whitespace-only text:
```json
{ "message": "Guess cannot be empty" }
```

**403 Forbidden** — caller is the drawer:
```json
{ "message": "Drawer cannot submit guesses" }
```

---

## NEW: POST /api/rooms/:code/strokes — Add a Stroke

**Adds one completed stroke to the canvas. Only the drawer may call this.**

### Request

```
POST /api/rooms/ABCD/strokes
Content-Type: application/json

{
  "participantId": "550e8400-...",
  "points": [{"x": 50, "y": 50}, {"x": 150, "y": 100}, {"x": 200, "y": 150}],
  "color": "#1e1e1e",
  "lineWidth": 3
}
```

### Responses

**201 Created** — stroke added:
```json
{
  "room": {
    "code": "ABCD",
    "status": "in_game",
    "strokes": [
      { "id": "uuid", "points": [...], "color": "#1e1e1e", "lineWidth": 3 }
    ]
  }
}
```

**403 Forbidden** — caller is not the drawer:
```json
{ "message": "Only the drawer can add strokes" }
```

**409 Conflict** — room not in in_game status:
```json
{ "message": "Game is not in progress" }
```

---

## NEW: DELETE /api/rooms/:code/strokes — Clear All Strokes

**Clears all stored strokes. Only the drawer may call this.**

### Request

```
DELETE /api/rooms/ABCD/strokes
Content-Type: application/json

{
  "participantId": "550e8400-..."
}
```

### Responses

**200 OK** — strokes cleared:
```json
{
  "room": {
    "code": "ABCD",
    "status": "in_game",
    "strokes": []
  }
}
```

**403 Forbidden** — caller is not the drawer:
```json
{ "message": "Only the drawer can clear the canvas" }
```

**404 Not Found** — room code not found:
```json
{ "message": "Room not found" }
```

**409 Conflict** — room not in `in_game` status:
```json
{ "message": "Game is not in progress" }
```
