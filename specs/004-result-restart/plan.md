# Implementation Plan: Result, Restart & Final Validation

**Branch**: `004-result-restart` | **Date**: 2026-06-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-result-restart/spec.md`

## Summary

Add a host-controlled "End Round" action that transitions the game to a result state, revealing
the secret word to all players and displaying final scores and guess history. The host can then
restart the game, returning all players to the lobby with round state cleared and scores reset to
zero. All transitions are detected by non-host players via the existing 2-second polling.

## Technical Context

**Language/Version**: TypeScript 5.6 — Node.js 18+ (backend), React 18 (frontend)
**Primary Dependencies**: Express 4.x, Zod 3.x, React 18, Vitest 3.x, Playwright
**Storage**: In-memory — existing `Map<string, Room>` in `roomStore.ts`
**Testing**: Vitest (unit + integration), Playwright (E2E) — all already installed
**Constraints**: No WebSockets, no DB, no new runtime dependencies
**New dependencies**: None

## Constitution Check

| Gate | Rule | Status |
|------|------|--------|
| 1 | Zero TypeScript errors, zero ESLint errors | ✅ Pass — new fields typed; no `any` |
| 2 | Unit + integration + E2E alongside code | ✅ Pass — all three tiers planned |
| 3 | REST conventions — Zod, POST, 403/404/409 | ✅ Pass — `POST /:code/end`, `POST /:code/restart` |
| 4 | No new runtime npm dependency | ✅ Pass |
| 5 | Accessibility — result view semantic HTML, roles visible | ✅ Pass |

No violations — Complexity Tracking not required.

## Project Structure

### Documentation

```text
specs/004-result-restart/
├── plan.md           ← this file
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── rooms-api.md
└── tasks.md
```

### Source Code

```text
backend/
├── src/
│   ├── models/
│   │   └── game.ts              ← add "result" to RoomStatus union
│   ├── services/
│   │   └── roomStore.ts         ← add endRound(), restartGame(); update toRoomSnapshot()
│   └── api/
│       ├── schemas.ts           ← add endRoundSchema, restartGameSchema
│       └── rooms.ts             ← add POST /:code/end + POST /:code/restart
└── tests/
    ├── unit/
    │   └── roomStore.test.ts    ← extend: endRound, restartGame, toRoomSnapshot in result
    └── integration/
        └── rooms.test.ts        ← extend: /end and /restart endpoints

frontend/
├── src/
│   ├── services/
│   │   └── api.ts              ← add "result" to status type; api.endRound(); api.restartGame()
│   ├── state/
│   │   └── roomStore.ts        ← add endRound(), restartGame() actions
│   └── pages/
│       ├── GamePage.tsx         ← update guard; add result view; End Round + Play Again buttons
│       └── LobbyPage.tsx        ← extend redirect to include "result" status → /game
└── tests/
    └── e2e/
        └── result.spec.ts       ← new: end round, result view, restart flow E2E
```

**Structure Decision**: Web application (Option 2) — same as features 001–003.

## Phase 0: Research

*See [research.md](research.md).*

All unknowns resolved from codebase analysis.

| Decision | Rationale |
|----------|-----------|
| Add `"result"` to `RoomStatus` | Cleanest state machine; polling-based detection is free |
| `word` exposed to ALL viewers in result status | Result state is the reveal — secrecy no longer applies |
| `POST /rooms/:code/end` (not DELETE) | Creates a new state (result); POST is semantically correct |
| `POST /rooms/:code/restart` | Mutates state (back to lobby); POST is correct |
| GamePage renders both `in_game` AND `result` | One route for the full game session; conditional rendering per status |
| LobbyPage redirect extended to include `"result"` | Guards against edge case where player lands on lobby mid-result |
| `restartGame` resets all scores to 0 | Clarification Q1: single-round per constitution; fresh clean game |
| Result view reuses existing `Scoreboard` and `ResultPanel` | DRY principle — components already render correctly |
| Canvas strokes remain visible in result state (not cleared from snapshot) | Result view is read-only; stale strokes on display are harmless |

## Phase 1: Design

### Backend State Model Changes

**`backend/src/models/game.ts`** — one addition:

```ts
export type RoomStatus = "lobby" | "in_game" | "result";
```

No other model interface changes. All existing fields (`word`, `guesses`, `strokes`,
`drawerParticipantId`) are cleared in-service during `restartGame()`, not via new model fields.

### Backend Service Changes

**`backend/src/services/roomStore.ts`**:

```ts
// New: endRound — transitions in_game → result (host only)
export function endRound(code: string, participantId: string) {
  const room = rooms.get(code);
  if (!room) return { error: "not_found" } as const;
  if (room.status !== "in_game") return { error: "not_in_game" } as const;
  if (participantId !== room.hostId) return { error: "not_host" } as const;

  room.status = "result";
  room.updatedAt = now();
  rooms.set(code, room);
  return { room: cloneRoom(room) };
}

// New: restartGame — transitions result → lobby, clears all round state (host only)
export function restartGame(code: string, participantId: string) {
  const room = rooms.get(code);
  if (!room) return { error: "not_found" } as const;
  if (room.status !== "result") return { error: "not_in_result" } as const;
  if (participantId !== room.hostId) return { error: "not_host" } as const;

  room.status = "lobby";
  room.word = undefined;
  room.drawerParticipantId = undefined;
  room.guesses = [];
  room.strokes = [];
  room.participants.forEach((p) => { p.score = 0; });
  room.updatedAt = now();
  rooms.set(code, room);
  return { room: cloneRoom(room) };
}

// Updated: toRoomSnapshot — word visible to ALL when status === "result"
// Replace the isDrawer check with:
const isDrawer =
  room.status === "in_game" &&
  viewerParticipantId !== undefined &&
  viewerParticipantId === room.drawerParticipantId;
const showWord = room.status === "result" || isDrawer;

return {
  ...existing fields...,
  ...(showWord && { word: room.word }),
  ...(room.status !== "lobby" && { drawerParticipantId: room.drawerParticipantId }),
  ...
};
```

### Backend Schema + Route Changes

**`backend/src/api/schemas.ts`**:
```ts
export const endRoundSchema = z.object({
  participantId: z.string().trim().min(1, "Participant ID is required")
});

export const restartGameSchema = z.object({
  participantId: z.string().trim().min(1, "Participant ID is required")
});
```

**`backend/src/api/rooms.ts`** — two new routes:
```ts
// POST /:code/end
router.post("/:code/end", (request, response, next) => {
  try {
    const { code } = roomCodeParamsSchema.parse(request.params);
    const { participantId } = endRoundSchema.parse(request.body);
    const result = endRound(code.toUpperCase(), participantId);
    if ("error" in result) {
      if (result.error === "not_found") throw new HttpError(404, "Room not found");
      if (result.error === "not_in_game") throw new HttpError(409, "Game is not in progress");
      throw new HttpError(403, "Only the host can end the round");
    }
    response.json({ room: toRoomSnapshot(result.room, participantId) });
  } catch (error) { next(error); }
});

// POST /:code/restart
router.post("/:code/restart", (request, response, next) => {
  try {
    const { code } = roomCodeParamsSchema.parse(request.params);
    const { participantId } = restartGameSchema.parse(request.body);
    const result = restartGame(code.toUpperCase(), participantId);
    if ("error" in result) {
      if (result.error === "not_found") throw new HttpError(404, "Room not found");
      if (result.error === "not_in_result") throw new HttpError(409, "Round has not ended yet");
      throw new HttpError(403, "Only the host can restart the game");
    }
    response.json({ room: toRoomSnapshot(result.room, participantId) });
  } catch (error) { next(error); }
});
```

### Frontend Type Changes

**`frontend/src/services/api.ts`**:
```ts
// RoomSnapshot.status gains "result"
status: "lobby" | "in_game" | "result";

// New methods
endRound(code: string, participantId: string) {
  return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/end`, {
    method: "POST", body: JSON.stringify({ participantId })
  });
},
restartGame(code: string, participantId: string) {
  return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/restart`, {
    method: "POST", body: JSON.stringify({ participantId })
  });
}
```

**`frontend/src/state/roomStore.ts`**:
```ts
async endRound() {
  if (!this.state.room || !this.state.participantId) return null;
  const response = await api.endRound(this.state.room.code, this.state.participantId);
  this.setRoomSnapshot(response.room);
  return response.room;
}

async restartGame() {
  if (!this.state.room || !this.state.participantId) return null;
  const response = await api.restartGame(this.state.room.code, this.state.participantId);
  this.setRoomSnapshot(response.room);
  return response.room;
}
```

**`frontend/src/pages/LobbyPage.tsx`** — extend redirect effect:
```tsx
useEffect(() => {
  if (!room) navigate("/", { replace: true });
  else if (room.status === "in_game" || room.status === "result") {
    navigate("/game", { replace: true });
  }
}, [navigate, room]);
```

**`frontend/src/pages/GamePage.tsx`** — three changes:

1. **Update redirect guard** — allow both in_game and result:
```tsx
useEffect(() => {
  if (!room) navigate("/", { replace: true });
  else if (room.status === "lobby") navigate("/lobby", { replace: true });
}, [navigate, room]);

// Guard render — allow both statuses
if (!room || (room.status !== "in_game" && room.status !== "result")) return null;
```

2. **"End Round" button** — host only, in_game status:
```tsx
{room.isHost && room.status === "in_game" && (
  <button className="button button--secondary" onClick={handleEndRound}>
    End Round
  </button>
)}
```

3. **Result view** — conditional block when status === "result":
```tsx
{room.status === "result" && (
  <section aria-label="Round results">
    <h2>Round Over!</h2>
    <p>The secret word was: <strong>{room.word}</strong></p>
    <Scoreboard participants={room.participants} />
    <ResultPanel guesses={room.guesses} />
    {room.isHost && (
      <button className="button button--primary" onClick={handleRestart}>
        Play Again
      </button>
    )}
  </section>
)}
```

### Data Flow

```
Host clicks "End Round"
─────────────────────────────────────────────────────────────
1. handleEndRound() → roomStore.endRound()
2.   → POST /rooms/:code/end {participantId}
3.      endRound(): status = "result"
4.   → 200 { room: { status:"result", word:"rocket" (for all) } }
5. setRoomSnapshot() → room.status = "result"
6. GamePage conditional render → result view; word visible to host

Non-host polling detects result
─────────────────────────────────────────────────────────────
7. fetchRoom() → GET /rooms/:code?participantId=guestId
8.    toRoomSnapshot(): status="result" → word included for guestId
9. GamePage re-renders → result view with word, scores, history

Host clicks "Play Again"
─────────────────────────────────────────────────────────────
10. handleRestart() → roomStore.restartGame()
11.   → POST /rooms/:code/restart {participantId}
12.      restartGame(): clears all round state, scores=0, status="lobby"
13.   → 200 { room: { status:"lobby", participants:[{score:0}...] } }
14. setRoomSnapshot() → room.status = "lobby"
15. GamePage redirect → navigate("/lobby")

Non-host polling detects lobby
─────────────────────────────────────────────────────────────
16. fetchRoom() → room.status = "lobby"
17. GamePage redirect → navigate("/lobby", {replace:true})
```

### Testing Strategy

**Unit** — extend `backend/tests/unit/roomStore.test.ts`:
- `endRound()` host → status = "result"
- `endRound()` non-host → `{ error: "not_host" }`
- `endRound()` wrong status → `{ error: "not_in_game" }`
- `toRoomSnapshot()` in result → `word` included for non-host viewer
- `restartGame()` host → status = "lobby", scores = 0, guesses = [], strokes = []
- `restartGame()` non-host → `{ error: "not_host" }`
- `restartGame()` wrong status → `{ error: "not_in_result" }`

**Integration** — extend `backend/tests/integration/rooms.test.ts`:
- `POST /rooms/:code/end` host → 200, status = "result"
- `POST /rooms/:code/end` guest → 403
- `POST /rooms/:code/end` not in_game → 409
- `GET /rooms/:code?participantId=guestId` in result → word included
- `POST /rooms/:code/restart` host → 200, status = "lobby", scores = 0
- `POST /rooms/:code/restart` guest → 403
- `POST /rooms/:code/restart` not in result → 409

**E2E** — new `frontend/tests/e2e/result.spec.ts`:
- Host sees "End Round"; guesser does not
- Host clicks "End Round" → result view with word "rocket"
- Guesser sees result view (with word) within 2500ms
- Host sees "Play Again"; guesser does not
- Host clicks "Play Again" → navigates to lobby
- Guesser navigates to lobby within 2500ms; scores show 0
