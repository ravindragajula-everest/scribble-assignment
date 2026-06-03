---
description: "Task list for Gameplay Interaction — Canvas Sync Amendment"
---

# Tasks: Gameplay Interaction — Canvas Sync Amendment

**Input**: Design documents from `/specs/003-gameplay-interaction/` (post-amendment)
**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contracts/ ✅

**Context**: The original feature 003 (guesses, scoring, basic canvas) is complete. This
file covers ONLY the canvas sync amendment (FR-012, FR-013, FR-014).

**Tests**: TDD (Red → Green) for unit/integration; E2E via Playwright.

**Amendment scope**:
- US1 (amended): Drawer sends strokes to server on mouseup; guessers re-render via polling
- US2 (amended): "Clear Canvas" clears strokes server-side; all players see blank canvas within 2s

## Format: `[ID] [P?] [Story?] Description`

---

## Phase 1: Foundational (Type System)

- [X] T001 Add `Stroke` interface (`id: string`, `points: {x:number,y:number}[]`, `color: string`, `lineWidth: number`) to `backend/src/models/game.ts`; add `strokes: Stroke[]` to `Room` interface; add `strokes: Stroke[]` to `RoomSnapshot` interface
- [X] T002 [P] Add `Stroke` type; add `strokes: Stroke[]` to `RoomSnapshot` in `frontend/src/services/api.ts`; add `api.addStroke(code, participantId, points, color?, lineWidth?)` calling `POST /rooms/:code/strokes`; add `api.clearStrokes(code, participantId)` calling `DELETE /rooms/:code/strokes` with body `{participantId}`
- [X] T003 Update `createRoom()` to initialize `strokes: []` in `backend/src/services/roomStore.ts`; update `toRoomSnapshot()` to include `strokes: room.strokes.map(s => ({...s, points: s.points.map(p => ({...p}))}))` — **Note**: after T003, the `toRoomSnapshot` strokes test in T004 item (c) turns GREEN immediately; the `addStroke` tests in T004 items (a) and (b) remain RED until T008

**Checkpoint**: `tsc --noEmit` passes in both packages. Existing 48 backend tests pass.

---

## Phase 2: User Story 1 — Stroke Sync to All Players (Priority: P1)

**Goal**: Each completed drawer stroke is sent to `POST /rooms/:code/strokes`. Guessers receive all strokes in the snapshot and re-render them on their canvas every 2s.

**Independent Test**: Drawer simulates mousedown+mousemove+mouseup in Tab A. Within 2500ms, Tab B guesser canvas shows non-blank content.

### Tests for US1 (TDD — confirm RED before implementing)

- [X] T004 [P] [US1] Extend `backend/tests/unit/roomStore.test.ts` (do not overwrite): failing unit tests for `addStroke()`: (a) drawer adds stroke → `room.strokes.length = 1`; (b) non-drawer → `{ error: "not_drawer" }`; (c) `toRoomSnapshot()` includes `strokes` array
- [X] T005 [P] [US1] Extend `backend/tests/integration/rooms.test.ts` (do not overwrite): failing integration tests for `POST /rooms/:code/strokes`: (a) drawer → 201, `strokes.length = 1`; (b) guesser → 403; (c) `GET /rooms/:code` after stroke → `strokes` populated
- [X] T006 [P] [US1] Extend `frontend/tests/e2e/gameplay.spec.ts`: failing E2E test in a new describe block "Canvas sync": drawer simulates draw (mousedown+mousemove+mouseup on canvas); waits 2500ms; asserts guesser's `<canvas>` element is visible and not blank (use `evaluate` to check `canvas.toDataURL() !== blankDataUrl`)

### Implementation for US1

- [X] T007 [US1] Add `addStrokeSchema` to `backend/src/api/schemas.ts`: `z.object({ participantId: z.string().trim().min(1, "Participant ID is required"), points: z.array(z.object({ x: z.number(), y: z.number() })).min(1, "Stroke must have at least one point"), color: z.string().default("#1e1e1e"), lineWidth: z.number().positive().default(3) })`
- [X] T008 [US1] Implement `addStroke(code, participantId, stroke)` in `backend/src/services/roomStore.ts` as a new exported function: validate drawer, validate in_game, create `{ id: randomUUID(), ...stroke }`, append to `room.strokes`, return `{ room: cloneRoom(room) }`
- [X] T009 [US1] Add `POST /:code/strokes` route handler to `backend/src/api/rooms.ts`: parse params with `roomCodeParamsSchema` + body with `addStrokeSchema`; call `addStroke()`; map `not_drawer` → 403, `not_found` → 404, `not_in_game` → 409; return `response.status(201).json({ room: toRoomSnapshot(result.room, participantId) })`
- [X] T010 [P] [US1] Add `addStroke(points)` method to `RoomStore` class in `frontend/src/state/roomStore.ts`: calls `api.addStroke(room.code, participantId, points)`; calls `setRoomSnapshot(response.room)` on success; throws on error
- [X] T011 [US1] Update drawer canvas logic in `frontend/src/pages/GamePage.tsx`: add `pointsRef = useRef<Array<{x:number;y:number}>>([])` at top; in `startDraw()` set `pointsRef.current = [getPos(e)]`; in `draw()` push `getPos(e)` to `pointsRef.current`; change `stopDraw()` to an async function — on mouseup call `if (pointsRef.current.length > 0) { await roomStore.addStroke(pointsRef.current).catch(() => {}); pointsRef.current = []; }` then set `isDrawingRef.current = false` — **Note**: passing an async `stopDraw` to `onMouseUp={stopDraw}` and `onMouseLeave={stopDraw}` is valid; React invokes the function and discards the returned Promise (fire-and-forget) — no wrapper needed in the JSX attributes
- [X] T012 [US1] Replace the guesser `canvas-placeholder` div in `frontend/src/pages/GamePage.tsx` with a read-only `<canvas ref={guestCanvasRef} ...>` (`guestCanvasRef = useRef<HTMLCanvasElement>(null)` at top); add `useEffect(() => { if (room.isHost || !guestCanvasRef.current) return; const ctx = guestCanvasRef.current.getContext("2d")!; ctx.clearRect(0, 0, 800, 500); for (const stroke of room.strokes ?? []) { ctx.beginPath(); ctx.strokeStyle = stroke.color; ctx.lineWidth = stroke.lineWidth; ctx.lineCap = "round"; ctx.moveTo(stroke.points[0].x, stroke.points[0].y); for (let i = 1; i < stroke.points.length; i++) { ctx.lineTo(stroke.points[i].x, stroke.points[i].y); } ctx.stroke(); } }, [room.strokes, room.isHost])` — **SEQUENTIAL after T011**
- [X] T013 [US1] Run `cd backend && npm test` — verify all US1 unit + integration tests pass (GREEN)
- [X] T014 [US1] Run `cd frontend && npx playwright test gameplay.spec.ts` — verify US1 E2E stroke sync test passes (GREEN)

**Checkpoint**: Drawer draws stroke → server stores it → guesser canvas shows strokes within 2500ms.

---

## Phase 3: User Story 2 — Server-Side Clear Canvas (Priority: P1)

**Goal**: "Clear Canvas" deletes all stored strokes from the server. Guessers' canvases go blank within one polling cycle after clear.

**Independent Test**: Drawer draws, guesser sees. Drawer clicks Clear Canvas. Within 2500ms, guesser canvas is blank.

**Dependencies**: US1 MUST be complete (strokes must be addable to test clearing removes them).

### Tests for US2 (TDD — confirm RED before implementing)

- [X] T015 [P] [US2] Extend `backend/tests/unit/roomStore.test.ts`: failing unit tests for `clearStrokes()`: (a) drawer clears → `room.strokes = []`; (b) non-drawer → `{ error: "not_drawer" }`
- [X] T016 [P] [US2] Extend `backend/tests/integration/rooms.test.ts`: failing integration tests for `DELETE /rooms/:code/strokes`: (a) drawer → 200, `room.strokes = []`; (b) guesser → 403
- [X] T017 [US2] Extend `frontend/tests/e2e/gameplay.spec.ts`: failing E2E test "drawer clears → guesser canvas blank within 2500ms": drawer draws stroke; waits for guesser to see it; drawer clicks "Clear Canvas"; waits 2500ms; verifies guesser canvas is blank (toDataURL matches blank)

### Implementation for US2

- [X] T018 [US2] Add `clearStrokesSchema` to `backend/src/api/schemas.ts`: `z.object({ participantId: z.string().trim().min(1, "Participant ID is required") })`
- [X] T019 [US2] Implement `clearStrokes(code, participantId)` in `backend/src/services/roomStore.ts`: validate drawer (403), validate in_game (409), set `room.strokes = []`, return `{ room: cloneRoom(room) }`
- [X] T020 [US2] Add `DELETE /:code/strokes` route to `backend/src/api/rooms.ts`: parse with `roomCodeParamsSchema` + `clearStrokesSchema` (in body); call `clearStrokes()`; map errors; return `response.json({ room: toRoomSnapshot(result.room, participantId) })`
- [X] T021 [P] [US2] Add `clearStrokes()` method to `RoomStore` class in `frontend/src/state/roomStore.ts`: calls `api.clearStrokes(room.code, participantId)`; calls `setRoomSnapshot(response.room)` on success
- [X] T022 [US2] Update `clearCanvas()` in `frontend/src/pages/GamePage.tsx` to make it async: add `await roomStore.clearStrokes().catch(() => {})` after `ctx.clearRect(...)` so the server is also cleared — **SEQUENTIAL after T012** (same file); update the JSX button `onClick` to `() => { void clearCanvas(); }` since it is now async
- [X] T023 [US2] Run `cd backend && npm test` — verify all US2 unit + integration tests pass (GREEN)
- [X] T024 [US2] Run `cd frontend && npx playwright test gameplay.spec.ts` — verify US2 clear sync test passes (GREEN)

**Checkpoint**: Drawer clears → server `room.strokes = []` → guesser canvas blank within 2500ms.

---

## Phase 4: Polish

- [X] T025 [P] Full backend regression: `cd backend && npm test`
- [X] T026 [P] Full frontend unit regression: `cd frontend && npm test`
- [X] T027 Full Playwright E2E suite including all prior spec files: `cd frontend && npx playwright test`
- [X] T028 ESLint both packages: `cd backend && npm run lint && cd ../frontend && npm run lint`
- [X] T029 TypeScript build validation: `cd backend && npm run build && cd ../frontend && npm run build`

---

## Dependencies

- **Foundational**: T001→T003; T002 parallel with T001
- **US1**: After Foundational — T004+T005+T006 parallel (RED); then T007→T008→T009 sequential; T010 parallel; T011→T012 sequential (GamePage.tsx)
- **US2**: After US1 — T015+T016 parallel (RED); T017 sequential; T018→T019→T020 sequential; T021 parallel; T022 sequential after T012 (same GamePage.tsx)
- **Polish**: After US1+US2

### Parallel Opportunities

```bash
T001 + T002 → T003
T004 + T005 + T006  (RED tests — all different files)
T007 → T008 → T009  (sequential, backend service layer)
T010 parallel with T007-T009  (frontend/src/state/roomStore.ts)
T011 → T012  (sequential, GamePage.tsx)
T015 + T016  (backend test files)
T021 parallel with T018-T020  (state/roomStore.ts)
T025 + T026 + T028  (parallel polish)
```

---

## Notes

- T011, T012, T022 all modify `GamePage.tsx` — strictly sequential in that order
- T003 modifies `roomStore.ts`; T008 and T019 also modify `roomStore.ts` — sequential within each phase
- The existing E2E tests (`game.spec.ts`, `lobby.spec.ts`, `validation.spec.ts`, `a11y.spec.ts`) MUST all still pass in T027
