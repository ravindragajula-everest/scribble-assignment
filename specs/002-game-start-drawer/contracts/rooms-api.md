# API Contract: Rooms (feature 002 additions)

**Feature**: 002-game-start-drawer
**Date**: 2026-06-02

This document covers ONLY the changes from feature 002. For the full existing contract
(POST /rooms, POST /rooms/:code/join, GET /rooms/:code), see
`specs/001-room-setup-lobby/contracts/rooms-api.md`.

## Updated Shared Types

```ts
// RoomStatus now includes "in_game"
type RoomStatus = "lobby" | "in_game";

// RoomSnapshot gains two new optional fields
interface RoomSnapshot {
  code: string;
  status: RoomStatus;           // now "lobby" | "in_game"
  participants: Participant[];
  availableWords: string[];
  roles: ParticipantRole[];
  isHost: boolean;
  word?: string;                // NEW: present only when viewer is the drawer (in_game)
  drawerParticipantId?: string; // NEW: present when status is "in_game"
}
```

All three existing endpoints (POST /rooms, POST /rooms/:code/join, GET /rooms/:code) now
return the updated `RoomSnapshot` with the new optional fields. The fields are absent when
the room is still in "lobby" status.

---

## NEW: POST /api/rooms/:code/start — Start Game

**Transitions the room from lobby to in_game. Assigns the host as drawer and selects the
secret word. Only the host may call this endpoint.**

### Request

```
POST /api/rooms/ABCD/start
Content-Type: application/json

{
  "participantId": "550e8400-e29b-41d4-a716-446655440000"
}
```

### Path Parameter

| Param | Type | Validation |
|-------|------|------------|
| `code` | string | trimmed; min 1 char |

### Request Body

| Field | Type | Validation |
|-------|------|------------|
| `participantId` | string | required; trimmed; min 1 char |

### Responses

**200 OK** — game started successfully:
```json
{
  "room": {
    "code": "ABCD",
    "status": "in_game",
    "participants": [
      { "id": "550e8400...", "name": "Alice", "joinedAt": "..." },
      { "id": "6ba7b810...", "name": "Bob",   "joinedAt": "..." }
    ],
    "availableWords": ["rocket","pizza","castle","guitar","sunflower"],
    "roles": ["drawer","guesser"],
    "isHost": true,
    "word": "rocket",
    "drawerParticipantId": "550e8400..."
  }
}
```

> **Note**: `word` is only present in the response because the requesting `participantId`
> is the drawer (host). A non-host calling this endpoint with a valid host participantId
> is not possible (403 blocks it), so `word` will always be present in a 200 response.

**400 Bad Request** — validation failure:
```json
{ "message": "Participant ID is required" }
```

**403 Forbidden** — caller is not the host:
```json
{ "message": "Only the host can start the game" }
```

**404 Not Found** — room code does not exist:
```json
{ "message": "Room not found" }
```

**409 Conflict** — room is already in_game:
```json
{ "message": "Game already started" }
```

---

## Updated GET /api/rooms/:code Response (when in_game)

When the room has been started, GET /api/rooms/:code returns:

**For the drawer (participantId === drawerParticipantId):**
```json
{
  "room": {
    "code": "ABCD",
    "status": "in_game",
    "participants": [...],
    "isHost": true,
    "word": "rocket",
    "drawerParticipantId": "550e8400..."
  }
}
```

**For a guesser (any other participantId):**
```json
{
  "room": {
    "code": "ABCD",
    "status": "in_game",
    "participants": [...],
    "isHost": false,
    "drawerParticipantId": "550e8400..."
  }
}
```

Note: `word` is absent from the guesser's snapshot — it is never included in the response
body, not merely hidden client-side.
