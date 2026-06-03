# API Contract: Rooms

**Base path**: `/api/rooms`
**Feature**: 001-room-setup-lobby
**Date**: 2026-06-02

Changes from starter: `RoomSnapshot` gains `isHost: boolean`; validation errors now return
field-specific messages; blank name/code inputs return 400 instead of being silently accepted.

---

## Shared Types

```ts
interface Participant {
  id: string;       // UUID
  name: string;     // trimmed player name
  joinedAt: string; // ISO 8601 timestamp
}

// Returned by all three endpoints
interface RoomSnapshot {
  code: string;
  status: "lobby";
  participants: Participant[];
  availableWords: string[];     // ["rocket","pizza","castle","guitar","sunflower"]
  roles: ParticipantRole[];     // ["drawer","guesser"]
  isHost: boolean;              // NEW: true iff viewer === room creator
}

interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
```

---

## POST /api/rooms — Create Room

**Creates a new room. The submitting player becomes the host.**

### Request

```
POST /api/rooms
Content-Type: application/json

{
  "playerName": "Alice"   // required; trimmed; min 1 char after trim
}
```

### Responses

**201 Created** — room created successfully:
```json
{
  "participantId": "550e8400-e29b-41d4-a716-446655440000",
  "room": {
    "code": "ABCD",
    "status": "lobby",
    "participants": [{ "id": "550e8400...", "name": "Alice", "joinedAt": "2026-06-02T10:00:00.000Z" }],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "roles": ["drawer","guesser"],
    "isHost": true
  }
}
```

**400 Bad Request** — blank or whitespace-only player name:
```json
{ "message": "Player name is required" }
```

> **Note**: A "blank" name means a value that is empty or contains only whitespace characters
> (e.g., `""`, `"   "`). Zod's `.trim().min(1)` catches these after trimming. An entirely
> absent `playerName` field also returns 400.

---

## POST /api/rooms/:code/join — Join Room

**Adds a player to an existing room. The joiner is never the host.**

### Request

```
POST /api/rooms/ABCD/join
Content-Type: application/json

{
  "playerName": "Bob"   // required; trimmed; min 1 char after trim
}
```

### Path Parameter

| Param | Type | Validation |
|-------|------|------------|
| `code` | string | trimmed; min 1 char; not validated for format beyond non-empty |

### Responses

**200 OK** — joined successfully:
```json
{
  "participantId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "room": {
    "code": "ABCD",
    "status": "lobby",
    "participants": [
      { "id": "550e8400...", "name": "Alice", "joinedAt": "..." },
      { "id": "6ba7b810...", "name": "Bob",   "joinedAt": "..." }
    ],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "roles": ["drawer","guesser"],
    "isHost": false
  }
}
```

**400 Bad Request** — blank or whitespace-only player name:
```json
{ "message": "Player name is required" }
```

**400 Bad Request** — whitespace-only room code (e.g., `"   "`):
```json
{ "message": "Room code is required" }
```

> **Note**: A truly absent `:code` path segment (e.g., `/api/rooms//join`) will not match
> the Express route pattern and returns a 404 from the router before Zod runs. The 400
> "Room code is required" response is only produced for whitespace-only string values
> submitted as the code — not for absent URL segments.

**404 Not Found** — room code does not match any active room:
```json
{ "message": "Unable to join room" }
```

---

## GET /api/rooms/:code — Fetch Room Snapshot

**Returns the current state of a room. `isHost` reflects the requesting participant.**

### Query Parameter

| Param | Type | Required | Notes |
|-------|------|----------|-------|
| `participantId` | string | No | When provided, used to compute `isHost`. Omit → `isHost: false` |

### Responses

**200 OK**:
```json
{
  "room": {
    "code": "ABCD",
    "status": "lobby",
    "participants": [ ... ],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "roles": ["drawer","guesser"],
    "isHost": true
  }
}
```

**404 Not Found** — room code does not exist:
```json
{ "message": "Unable to load room" }
```

---

## Error Shape

All error responses follow this structure:
```json
{ "message": "<human-readable description>" }
```

No stack traces are included in error responses.
