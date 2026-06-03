# Research: Gameplay Interaction

**Feature**: 003-gameplay-interaction
**Date**: 2026-06-02
**Status**: Complete — all resolved from codebase analysis

## Findings

### 1. Guess Data Model — In-Memory Array

**Decision**: Store `guesses: Guess[]` directly on `Room`. Append on each submission.
Clone in `toRoomSnapshot()` like participants.

**Rationale**: Consistent with how participants are stored and snapshotted. No secondary
data structure needed for a single-round, in-memory game.

---

### 2. Score on Participant

**Decision**: Add `score: number` (default 0) directly to the `Participant` interface.
Increment in `submitGuess()` when `isCorrect === true`.

**Rationale**: Simplest model. No separate score map. Score travels with the participant
in every snapshot, so clients always have accurate per-player scores without extra lookups.

---

### 3. Canvas: HTML5 Canvas API, No Library

**Decision**: Use a `<canvas>` element with React `useRef` and standard mouse event handlers
(`onMouseDown`, `onMouseMove`, `onMouseUp`, `onMouseLeave`). Store drawing state in
`useRef` (not `useState`) to avoid re-renders during drawing.

**Rationale**: No new dependency. The HTML5 Canvas API is sufficient for freehand drawing.
`useRef` for mutable drawing state prevents React re-rendering on every mouse-move (which
would be ~60 re-renders per second).

**Alternatives considered**:
- `konva` / `fabric.js` — rejected: new runtime dependency (constitution Principle IV)
- `useState` for `isDrawing` — rejected: causes excessive re-renders during mousemove

---

### 4. Canvas Clear — Local Only, No Server Call

**Decision**: `clearCanvas()` calls `ctx.clearRect(0, 0, width, height)` on the local
`<canvas>` element. No API call, no server state change.

**Rationale**: FR-012 explicitly states canvas is NOT synced. The clear is a local drawing
tool action only. This keeps the backend free of canvas state entirely.

---

### 5. GuessForm Uses `useRoomStore()` Directly

**Decision**: `GuessForm` imports `useRoomStore()` and `useRoomState()` rather than
receiving `onSubmit` callback props from `GamePage`.

**Rationale**: Consistent with how `LobbyPage` uses the store. Avoids threading
`participantId`, `room.code`, and callbacks through `GamePage` → `GuessForm`. The store
is the single source of truth.

---

### 6. Scoreboard and ResultPanel Receive Props

**Decision**: `Scoreboard` accepts `participants: Participant[]`. `ResultPanel` accepts
`guesses: Guess[]`. `GamePage` passes `room.participants` and `room.guesses`.

**Rationale**: Components are easier to unit-test with explicit props. `GamePage` is the
data owner for the game session; components are display-only.

---

### 7. Immediate Feedback (FR-010a) via `response.room`

**Decision**: After `submitGuess()` succeeds, `setRoomSnapshot(response.room)` is called
immediately with the server's full updated snapshot.

**Rationale**: The server returns `{ guess, room }` where `room` includes the new guess
appended and the participant's updated score. Using `response.room` gives immediate AND
accurate state — no separate optimistic update logic needed. The guesser's own entry
appears instantly without waiting for the next 2s poll.

---

### 8. GamePage Polling — Same Pattern as LobbyPage

**Decision**: `setInterval(() => roomStore.fetchRoom().catch(() => {}), 2000)` in a
`useEffect` with `clearInterval` cleanup on unmount.

**Rationale**: Reuses the exact same pattern from `LobbyPage` (already tested and working).
No new polling infrastructure. The existing `GET /rooms/:code` endpoint already returns
`guesses` and scores once this feature adds them to `toRoomSnapshot()`.
