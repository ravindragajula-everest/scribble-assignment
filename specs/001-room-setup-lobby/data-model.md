# Data Model: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-02

## Changes (additions only — no fields removed)

### `Room` (backend internal — `backend/src/models/game.ts`)

| Field | Type | Change | Notes |
|-------|------|--------|-------|
| `code` | `string` | Unchanged | 4-character unique code |
| `status` | `RoomStatus` | Unchanged | `"lobby"` only in this feature |
| `participants` | `Participant[]` | Unchanged | All players who joined |
| `hostId` | `string` | **NEW** | Participant ID of the room creator |
| `createdAt` | `string` | Unchanged | ISO timestamp |
| `updatedAt` | `string` | Unchanged | ISO timestamp, updated on join |

`hostId` is set once at creation and never changes for the lifetime of the room.
It is internal — not exposed in the API response.

---

### `RoomSnapshot` (API response — `backend/src/models/game.ts` + `frontend/src/services/api.ts`)

| Field | Type | Change | Notes |
|-------|------|--------|-------|
| `code` | `string` | Unchanged | |
| `status` | `RoomStatus` | Unchanged | |
| `participants` | `Participant[]` | Unchanged | |
| `availableWords` | `string[]` | Unchanged | |
| `roles` | `ParticipantRole[]` | Unchanged | |
| `isHost` | `boolean` | **NEW** | `true` iff the requesting participant is the host |

`isHost` is computed per-request in `toRoomSnapshot(room, viewerParticipantId)`:
- `viewerParticipantId === room.hostId` → `true`
- any other value (including `undefined`) → `false`

---

### `Participant` (unchanged)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | UUID |
| `name` | `string` | Trimmed player name |
| `joinedAt` | `string` | ISO timestamp |

---

## Validation Rules (Zod — `backend/src/api/schemas.ts`)

| Schema | Field | Rule | Error message |
|--------|-------|------|---------------|
| `createRoomSchema` | `playerName` | `z.string().trim().min(1)` | "Player name is required" |
| `joinRoomSchema` | `playerName` | `z.string().trim().min(1)` | "Player name is required" |
| `roomCodeParamsSchema` | `code` | `z.string().trim().min(1)` | "Room code is required" |

Trimming is applied by Zod before the min(1) check, so whitespace-only inputs are
treated as empty and rejected.

---

## State Transitions (this feature scope)

```
[User fills Create Room form]
    → validatePlayerName() — client-side guard
    → POST /api/rooms {playerName}
        → Zod trims + validates
        → createRoom() — room.hostId = participant.id
        → 201 {participantId, room: {isHost: true}}
    → navigate /lobby

[User fills Join Room form]
    → validatePlayerName() + validateRoomCode() — client-side guard
    → POST /api/rooms/:code/join {playerName}
        → Zod trims + validates
        → joinRoom() — hostId unchanged
        → 200 {participantId, room: {isHost: false}}
    → navigate /lobby

[LobbyPage — every 2s]
    → GET /api/rooms/:code?participantId=<viewer>
        → toRoomSnapshot(room, viewer) → isHost: viewer === hostId
        → 200 {room: {participants: [...], isHost: true|false}}
    → React re-renders participant list + button state
```

---

## Invariants

1. `room.hostId` is set exactly once — at `createRoom()` — and never mutated.
2. `RoomSnapshot.isHost` is always `false` when `viewerParticipantId` is `undefined`.
3. A room always has at least one participant (the creator). `participants.length >= 1`.
4. `room.hostId` always equals `room.participants[0].id` (first participant is always the host).
