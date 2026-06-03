# Data Model: Gameplay Interaction (Canvas Sync Amendment)

**Feature**: 003-gameplay-interaction
**Date**: 2026-06-02 (amended with canvas sync)

## New Entity (Amendment)

### `Stroke` (backend internal + API response)

| Field | Type | Notes |
|-------|------|-------|
| `id` | `string` | UUID, generated on submission |
| `points` | `Array<{x:number,y:number}>` | All mouse positions recorded during the stroke (min 1 point) |
| `color` | `string` | Stroke color; default `"#1e1e1e"` |
| `lineWidth` | `number` | Stroke width in pixels; default `3` |

A `Stroke` is immutable once created. It is appended to `room.strokes` on submit.
On "Clear Canvas", `room.strokes` is reset to `[]` — individual strokes are not deleted.

---

## Changed Entities (Amendment)

### `Room` (backend internal — additional fields)

| Field | Type | Change | Notes |
|-------|------|--------|-------|
| `strokes` | `Stroke[]` | **NEW** | Initialized to `[]` on room creation; appended per addStroke(); reset to `[]` on clearStrokes() |

### `RoomSnapshot` (API response — additional field)

| Field | Type | Change | Notes |
|-------|------|--------|-------|
| `strokes` | `Stroke[]` | **NEW** | Full stroke array for all viewers; `[]` in lobby or when no strokes drawn |

---

## Previously Added (original feature 003)

| Entity | Field | Notes |
|--------|-------|-------|
| `Guess` | id, participantId, participantName, text, isCorrect, timestamp | Added in original feature 003 |
| `Participant` | score: number | Added in original feature 003 |
| `Room` | guesses: Guess[] | Added in original feature 003 |
| `RoomSnapshot` | guesses: Guess[] | Added in original feature 003 |

---

## addStroke / clearStrokes Logic

```
addStroke(code, participantId, {points, color, lineWidth}):
1. Find room by code → 404 if missing
2. Check room.status === "in_game" → 409 if not
3. Check participantId === room.drawerParticipantId → 403 if not drawer
4. Create Stroke { id: UUID, points, color, lineWidth }
5. Append to room.strokes
6. Return { room: cloneRoom(room) }

clearStrokes(code, participantId):
1. Find room → 404 if missing
2. Check room.status === "in_game" → 409 if not
3. Check participantId === room.drawerParticipantId → 403 if not drawer
4. Set room.strokes = []
5. Return { room: cloneRoom(room) }
```

---

## Invariants

1. `room.strokes` is always present (never undefined); initialized to `[]` on room creation.
2. Only the drawer (`room.drawerParticipantId`) can add or clear strokes.
3. Clearing resets the entire `strokes` array — individual strokes cannot be deleted.
4. `Stroke.points` always has at least 1 point.
