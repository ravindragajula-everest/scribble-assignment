# Implementation Plan: Gameplay Interaction (Canvas Sync Amendment)

**Branch**: `003-gameplay-interaction` | **Date**: 2026-06-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-gameplay-interaction/spec.md`

## Context

The original feature 003 is already implemented (guesses, scoring, basic canvas for drawer,
2s polling on GamePage). This plan covers the **canvas sync amendment** only: storing strokes
on the server and delivering them to guessers via the existing polling mechanism.

## Summary

Add a `Stroke` entity to the backend data model. Each completed stroke the drawer makes
(mouseup) is sent to `POST /rooms/:code/strokes`. The server appends it to
`room.strokes`. `DELETE /rooms/:code/strokes` clears all strokes (also called on "Clear
Canvas"). The room snapshot includes `strokes` so the existing 2-second polling delivers
the current canvas state to all players. Guessers render a read-only `<canvas>` that
re-draws all strokes on each poll.

## Technical Context

**Language/Version**: TypeScript 5.6 — Node.js 18+ (backend), React 18 (frontend)
**Primary Dependencies**: Express 4.x, Zod 3.x, React 18, Vitest 3.x, Playwright
**Storage**: In-memory — strokes stored as `Stroke[]` on `Room`; cleared on demand
**Testing**: Vitest (unit + integration), Playwright (E2E) — all already installed
**Constraints**: No WebSockets; HTTP polling only; no new runtime dependencies

## Constitution Check

| Gate | Rule | Status |
|------|------|--------|
| 1 | Zero TypeScript errors, zero ESLint errors | ✅ Pass |
| 2 | Unit + integration + E2E alongside code | ✅ Pass — all three tiers planned |
| 3 | REST: Zod on every body, POST/201, DELETE/200, correct errors | ✅ Pass |
| 4 | No new runtime npm dependency | ✅ Pass |
| 5 | Accessibility — guesser canvas has `aria-label`, drawer canvas unchanged | ✅ Pass |

## Project Structure (canvas sync delta only)

```text
backend/
├── src/
│   ├── models/
│   │   └── game.ts              ← add Stroke interface; add strokes: Stroke[] to Room + RoomSnapshot
│   ├── services/
│   │   └── roomStore.ts         ← add addStroke(), clearStrokes(); update createRoom(), toRoomSnapshot()
│   └── api/
│       ├── schemas.ts           ← add addStrokeSchema, clearStrokesSchema
│       └── rooms.ts             ← add POST /:code/strokes + DELETE /:code/strokes
└── tests/
    ├── unit/
    │   └── roomStore.test.ts    ← extend: addStroke, clearStrokes
    └── integration/
        └── rooms.test.ts        ← extend: /strokes POST + DELETE

frontend/
├── src/
│   ├── services/
│   │   └── api.ts              ← add Stroke type; strokes: Stroke[] to RoomSnapshot; api.addStroke() + api.clearStrokes()
│   └── pages/
│       └── GamePage.tsx        ← drawer: collect points array + send on mouseup; guesser: read-only canvas re-rendering room.strokes; clearCanvas sends to server
└── tests/
    └── e2e/
        └── gameplay.spec.ts    ← extend: stroke sync test (drawer draws → guesser sees within 2500ms)
```

## Phase 0: Research

All unknowns resolved from codebase analysis.

| Decision | Rationale |
|----------|-----------|
| Store all points of a stroke as `{x,y}[]` array | Allows full re-rendering on guesser side; compact for in-memory storage |
| One HTTP call per completed stroke (mouseup) | Aligns with polling model; sends batch rather than every mousemove |
| Guesser re-renders ALL strokes on every poll | Simplest stateless approach; no incremental diff needed for this scale |
| `DELETE /rooms/:code/strokes` for clear | Semantically correct (removing a resource); body carries `participantId` for auth |
| Guesser canvas: replace placeholder div with read-only `<canvas>` | Guessers must now see the drawing; placeholder is insufficient |

## Phase 1: Design

### Backend State Model Changes

**`backend/src/models/game.ts`** — additions:

```ts
export interface Stroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  lineWidth: number;
}

// Room gains strokes
export interface Room {
  // ... existing fields ...
  strokes: Stroke[];    // NEW — initialized to []; appended on addStroke; cleared on clearStrokes
}

// RoomSnapshot gains strokes
export interface RoomSnapshot {
  // ... existing fields ...
  strokes: Stroke[];    // NEW — full stroke array for all viewers
}
```

### Backend Service Changes

**`backend/src/services/roomStore.ts`**:

```ts
// createRoom — initialize strokes: []
const room: Room = { ..., guesses: [], strokes: [], ... };

// New: addStroke — drawer only
export function addStroke(code: string, participantId: string, stroke: Omit<Stroke, "id">) {
  const room = rooms.get(code);
  if (!room) return { error: "not_found" } as const;
  if (room.status !== "in_game") return { error: "not_in_game" } as const;
  if (participantId !== room.drawerParticipantId) return { error: "not_drawer" } as const;
  const newStroke: Stroke = { id: randomUUID(), ...stroke };
  room.strokes.push(newStroke);
  room.updatedAt = now();
  rooms.set(code, room);
  return { room: cloneRoom(room) };
}

// New: clearStrokes — drawer only
export function clearStrokes(code: string, participantId: string) {
  const room = rooms.get(code);
  if (!room) return { error: "not_found" } as const;
  if (room.status !== "in_game") return { error: "not_in_game" } as const;
  if (participantId !== room.drawerParticipantId) return { error: "not_drawer" } as const;
  room.strokes = [];
  room.updatedAt = now();
  rooms.set(code, room);
  return { room: cloneRoom(room) };
}

// toRoomSnapshot — include strokes
return {
  ...existing fields...,
  strokes: room.strokes.map((s) => ({ ...s, points: s.points.map((p) => ({ ...p })) }))
};
```

### Backend Schema + Routes

**`backend/src/api/schemas.ts`**:
```ts
export const addStrokeSchema = z.object({
  participantId: z.string().trim().min(1, "Participant ID is required"),
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(1, "Stroke must have at least one point"),
  color: z.string().default("#1e1e1e"),
  lineWidth: z.number().positive().default(3)
});

export const clearStrokesSchema = z.object({
  participantId: z.string().trim().min(1, "Participant ID is required")
});
```

**`backend/src/api/rooms.ts`** — two new routes:
```ts
// POST /:code/strokes — drawer adds a completed stroke
router.post("/:code/strokes", (request, response, next) => {
  try {
    const { code } = roomCodeParamsSchema.parse(request.params);
    const { participantId, points, color, lineWidth } = addStrokeSchema.parse(request.body);
    const result = addStroke(code.toUpperCase(), participantId, { points, color, lineWidth });
    if ("error" in result) {
      if (result.error === "not_found") throw new HttpError(404, "Room not found");
      if (result.error === "not_in_game") throw new HttpError(409, "Game is not in progress");
      throw new HttpError(403, "Only the drawer can add strokes");
    }
    response.status(201).json({ room: toRoomSnapshot(result.room, participantId) });
  } catch (error) { next(error); }
});

// DELETE /:code/strokes — drawer clears all strokes
router.delete("/:code/strokes", (request, response, next) => {
  try {
    const { code } = roomCodeParamsSchema.parse(request.params);
    const { participantId } = clearStrokesSchema.parse(request.body);
    const result = clearStrokes(code.toUpperCase(), participantId);
    if ("error" in result) {
      if (result.error === "not_found") throw new HttpError(404, "Room not found");
      if (result.error === "not_in_game") throw new HttpError(409, "Game is not in progress");
      throw new HttpError(403, "Only the drawer can clear the canvas");
    }
    response.json({ room: toRoomSnapshot(result.room, participantId) });
  } catch (error) { next(error); }
});
```

### Frontend Type Changes

**`frontend/src/services/api.ts`**:
```ts
export interface Stroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  lineWidth: number;
}

// RoomSnapshot gains strokes
export interface RoomSnapshot {
  ...existing...
  strokes: Stroke[];
}

// New API methods
addStroke(code: string, participantId: string, points: Array<{x:number;y:number}>, color = "#1e1e1e", lineWidth = 3) {
  return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/strokes`, {
    method: "POST",
    body: JSON.stringify({ participantId, points, color, lineWidth })
  });
},
clearStrokes(code: string, participantId: string) {
  return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/strokes`, {
    method: "DELETE",
    body: JSON.stringify({ participantId })
  });
}
```

### Frontend RoomStore Changes

**`frontend/src/state/roomStore.ts`**:
```ts
async addStroke(points: Array<{x:number;y:number}>) {
  if (!this.state.room || !this.state.participantId) return null;
  const response = await api.addStroke(this.state.room.code, this.state.participantId, points);
  this.setRoomSnapshot(response.room);
  return response.room;
}

async clearStrokes() {
  if (!this.state.room || !this.state.participantId) return null;
  const response = await api.clearStrokes(this.state.room.code, this.state.participantId);
  this.setRoomSnapshot(response.room);
  return response.room;
}
```

### Frontend GamePage Changes

**`frontend/src/pages/GamePage.tsx`** — two changes:

1. **Drawer — collect points and send on mouseup**:
```tsx
// Add pointsRef to collect the current stroke's points
const pointsRef = useRef<Array<{x: number; y: number}>>([]);

function startDraw(e) {
  isDrawingRef.current = true;
  const pos = getPos(e);
  lastPos.current = pos;
  pointsRef.current = [pos];  // start collecting points
}

function draw(e) {
  if (!isDrawingRef.current || !canvasRef.current) return;
  const pos = getPos(e);
  // ... existing canvas drawing code ...
  pointsRef.current.push(pos);  // collect point
  lastPos.current = pos;
}

async function stopDraw() {
  if (!isDrawingRef.current) return;
  isDrawingRef.current = false;
  if (pointsRef.current.length > 0) {
    await roomStore.addStroke(pointsRef.current).catch(() => {});
    pointsRef.current = [];
  }
}
```

2. **Drawer — Clear Canvas sends to server**:
```tsx
async function clearCanvas() {
  if (!canvasRef.current) return;
  canvasRef.current.getContext("2d")?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  await roomStore.clearStrokes().catch(() => {});
}
```

3. **Guesser — read-only canvas re-rendering room.strokes**:
```tsx
// Replace the canvas-placeholder div with a read-only <canvas>
// On every render (poll updates room.strokes), re-draw all strokes

const guestCanvasRef = useRef<HTMLCanvasElement>(null);

useEffect(() => {
  if (room.isHost || !guestCanvasRef.current) return;
  const ctx = guestCanvasRef.current.getContext("2d")!;
  ctx.clearRect(0, 0, guestCanvasRef.current.width, guestCanvasRef.current.height);
  for (const stroke of room.strokes) {
    if (stroke.points.length < 2) continue;
    ctx.beginPath();
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.lineWidth;
    ctx.lineCap = "round";
    ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
    for (let i = 1; i < stroke.points.length; i++) {
      ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
    }
    ctx.stroke();
  }
}, [room.strokes, room.isHost]);

// In JSX — guesser sees read-only canvas
{!room.isHost && (
  <canvas
    ref={guestCanvasRef}
    width={800} height={500}
    style={{ border: "1px solid #e5e7eb", backgroundColor: "#ffffff", display: "block", maxWidth: "100%" }}
    aria-label="Drawing canvas (read-only)"
  />
)}
```

### Data Flow

```
Drawer draws a stroke (mousedown → mousemove → mouseup)
────────────────────────────────────────────────────────────────
1. startDraw() → isDrawing=true; pointsRef=[]
2. draw() x N → canvas renders locally; points collected
3. stopDraw() → roomStore.addStroke(points)
4.             → api.addStroke(code, participantId, points)
5.             ← POST /rooms/:code/strokes {participantId, points, color, lineWidth}
6.                addStroke(): appends Stroke to room.strokes
7.             → 201 { room: { strokes: [...] } }
8. setRoomSnapshot(response.room) → room.strokes updated

Guesser polling (every 2s)
────────────────────────────────────────────────────────────────
9.  setInterval fires → fetchRoom() → GET /rooms/:code?participantId=xxx
10.    toRoomSnapshot() returns strokes: [...all strokes...]
11. room.strokes updated in state
12. useEffect(room.strokes) fires → re-renders all strokes on guestCanvasRef

Drawer clicks "Clear Canvas"
────────────────────────────────────────────────────────────────
13. clearCanvas() → ctx.clearRect() locally → roomStore.clearStrokes()
14.             ← DELETE /rooms/:code/strokes {participantId}
15.                clearStrokes(): room.strokes = []
16.             → 200 { room: { strokes: [] } }
17. setRoomSnapshot() → room.strokes = [] in state
18. Guesser next poll → strokes: [] → useEffect clears their canvas
```

### Testing Strategy

**Unit** — extend `backend/tests/unit/roomStore.test.ts`:
- `addStroke()` by drawer → appends stroke; `room.strokes.length = 1`
- `addStroke()` by non-drawer → `{ error: "not_drawer" }`
- `clearStrokes()` by drawer → `room.strokes = []`
- `clearStrokes()` by non-drawer → `{ error: "not_drawer" }`
- `toRoomSnapshot()` includes strokes array

**Integration** — extend `backend/tests/integration/rooms.test.ts`:
- `POST /rooms/:code/strokes` by drawer → 201, strokes.length = 1
- `POST /rooms/:code/strokes` by guesser → 403
- `DELETE /rooms/:code/strokes` by drawer → 200, strokes = []
- `DELETE /rooms/:code/strokes` by guesser → 403
- `GET /rooms/:code` after stroke → strokes array populated

**E2E** — extend `frontend/tests/e2e/gameplay.spec.ts`:
- Drawer draws a stroke → within 2500ms, guesser's canvas shows strokes (not blank)
- Drawer clicks "Clear Canvas" → within 2500ms, guesser's canvas is blank again
