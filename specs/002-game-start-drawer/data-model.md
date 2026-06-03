# Data Model: Game Start & Drawer Flow

**Feature**: 002-game-start-drawer
**Date**: 2026-06-02

## Changes (additions only — no fields removed)

### `Room` (backend internal — `backend/src/models/game.ts`)

| Field | Type | Change | Notes |
|-------|------|--------|-------|
| `code` | `string` | Unchanged | |
| `status` | `RoomStatus` | **Extended** | Now `"lobby" \| "in_game"` (was `"lobby"` only) |
| `participants` | `Participant[]` | Unchanged | |
| `hostId` | `string` | Unchanged | From feature 001 |
| `word` | `string \| undefined` | **NEW** | Set to `"rocket"` (STARTER_WORDS[0]) when game starts; absent in lobby |
| `drawerParticipantId` | `string \| undefined` | **NEW** | Set to `hostId` when game starts; absent in lobby |
| `createdAt` | `string` | Unchanged | |
| `updatedAt` | `string` | Unchanged | |

`word` and `drawerParticipantId` are set atomically in `startGame()` — both are either
present together or absent together. No partial state is possible.

---

### `RoomSnapshot` (API response — both backend and frontend)

| Field | Type | Change | Notes |
|-------|------|--------|-------|
| `code` | `string` | Unchanged | |
| `status` | `RoomStatus` | **Extended** | Now `"lobby" \| "in_game"` |
| `participants` | `Participant[]` | Unchanged | |
| `availableWords` | `string[]` | Unchanged | |
| `roles` | `ParticipantRole[]` | Unchanged | |
| `isHost` | `boolean` | Unchanged | From feature 001 |
| `word` | `string \| undefined` | **NEW** | Present ONLY when `status === "in_game"` AND viewer is the drawer |
| `drawerParticipantId` | `string \| undefined` | **NEW** | Present when `status === "in_game"`; same value for all viewers |

`word` is viewer-scoped (server filters per request). `drawerParticipantId` is the same
for all viewers — it identifies who is drawing so clients can display the drawer's name.

---

### `RoomStatus` type

```ts
// Before (feature 001):
export type RoomStatus = "lobby";

// After (feature 002):
export type RoomStatus = "lobby" | "in_game";
```

---

### `Participant` (unchanged)

No changes. Fields: `id`, `name`, `joinedAt`.

---

## State Transitions

```
Room created by host
  → status: "lobby"
  → word: undefined
  → drawerParticipantId: undefined

Host calls POST /rooms/:code/start (valid, ≥2 players implied by UI gate)
  → status: "in_game"
  → word: "rocket"
  → drawerParticipantId: hostId
  (This is the only transition. No revert to "lobby" in this feature scope.)
```

---

## toRoomSnapshot Logic (updated)

```
Given room R and viewer V:

isHost      = V.id === R.hostId
isDrawer    = R.status === "in_game" && V.id === R.drawerParticipantId

snapshot.status              = R.status
snapshot.isHost              = isHost
snapshot.drawerParticipantId = R.status === "in_game" ? R.drawerParticipantId : undefined
snapshot.word                = isDrawer ? R.word : undefined
```

---

## Invariants

1. `room.word` and `room.drawerParticipantId` are either both set or both absent — no partial state.
2. `room.drawerParticipantId` always equals `room.hostId` (host is always the drawer).
3. `snapshot.word` is ONLY ever non-undefined when `snapshot.isHost === true`.
4. Once status transitions to `"in_game"`, it stays `"in_game"` for the lifetime of this feature scope.
