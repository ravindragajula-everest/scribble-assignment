---
description: "Task list for Result, Restart & Final Validation"
---

# Tasks: Result, Restart & Final Validation

**Input**: Design documents from `/specs/004-result-restart/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Required per constitution Principle II — TDD (Red → Green) for unit/integration; E2E via Playwright.

**Organization**:
- US1 (end round) is the foundation — blocks US2 and US3
- US2 (result view) and US3 (restart) BOTH modify `GamePage.tsx` — MUST be sequential: US1 → US2 → US3
- `toRoomSnapshot()` word visibility update (T008) and `endRound()` (T007) are in the same file — sequential within US1

**No Phase 1 Setup needed** — all infrastructure installed from features 001–003.

## Format: `[ID] [P?] [Story?] Description`

---

## Phase 1: Foundational (Type System)

**Purpose**: Add `"result"` to `RoomStatus` in both backend and frontend. All user story phases depend on this.

- [ ] T001 Add `"result"` to `RoomStatus` union type: `"lobby" | "in_game" | "result"` in `backend/src/models/game.ts`
- [ ] T002 [P] Update `RoomSnapshot.status` type to `"lobby" | "in_game" | "result"` in `frontend/src/services/api.ts`; add `api.endRound(code, participantId)` method calling `POST /rooms/:code/end`; add `api.restartGame(code, participantId)` method calling `POST /rooms/:code/restart`

**Checkpoint**: `tsc --noEmit` passes in both packages. Existing 58 backend tests still pass.

---

## Phase 2: User Story 1 — Host Ends the Round (Priority: P1) 🎯 MVP

**Goal**: Host clicks "End Round" → room transitions to result status → all players detect via polling.

**Independent Test**: Host clicks "End Round". Host immediately sees status change. Within 2500ms, guesser also detects result status (via E2E polling test).

### Tests for US1 (TDD — write FIRST, verify RED)

- [ ] T003 [P] [US1] Extend `backend/tests/unit/roomStore.test.ts` (do not overwrite): failing unit tests for `endRound()`: (a) host → status = "result"; (b) non-host → `{ error: "not_host" }`; (c) wrong status (not in_game) → `{ error: "not_in_game" }`; (d) `toRoomSnapshot()` in result status → word included for non-host viewer
- [ ] T004 [P] [US1] Extend `backend/tests/integration/rooms.test.ts` (do not overwrite): failing integration tests for `POST /rooms/:code/end`: (a) host → 200, status = "result"; (b) guest → 403; (c) wrong status → 409
- [ ] T005 [P] [US1] Write failing E2E tests in `frontend/tests/e2e/result.spec.ts` (new file): (a) host sees "End Round" button; guesser does not; (b) host clicks "End Round" → host sees result status immediately; (c) guesser detects result status within 2500ms via polling

### Implementation for US1

> **NOTE**: Implement AFTER T003, T004, T005 confirmed failing

- [ ] T006 [US1] Add `endRoundSchema` to `backend/src/api/schemas.ts`: `z.object({ participantId: z.string().trim().min(1, "Participant ID is required") })`
- [ ] T007 [US1] Implement `endRound(code, participantId)` in `backend/src/services/roomStore.ts`: validate host (403), validate in_game (409), set `room.status = "result"`, return `{ room: cloneRoom(room) }`
- [ ] T008 [US1] Update `toRoomSnapshot()` in `backend/src/services/roomStore.ts` to show `word` to ALL viewers when `room.status === "result"` — change `const showWord = room.status === "result" || isDrawer;` — **SEQUENTIAL after T007** (same file); also include `drawerParticipantId` in snapshot when status is "result" (not just "in_game")
- [ ] T009 [US1] Add `POST /:code/end` route to `backend/src/api/rooms.ts`: parse with `roomCodeParamsSchema` + `endRoundSchema`; call `endRound()`; map `not_host` → 403, `not_in_game` → 409, `not_found` → 404; return `response.json({ room: toRoomSnapshot(result.room, participantId) })`
- [ ] T010 [P] [US1] Add `endRound()` method to `RoomStore` class in `frontend/src/state/roomStore.ts`: calls `api.endRound(room.code, participantId)`; calls `setRoomSnapshot(response.room)` on success
- [ ] T011 [US1] Update `frontend/src/pages/GamePage.tsx` — three distinct changes in one atomic commit: **(a) guards** — change `if (room?.status !== "in_game") return null` to `if (!room || (room.status !== "in_game" && room.status !== "result")) return null`; **(b) redirect useEffect** — the existing `else if (room.status === "lobby") navigate("/lobby")` is already correct (no change needed); **(c) button** — add `async function handleEndRound() { await roomStore.endRound().catch(() => {}); }` and `{room.isHost && room.status === "in_game" && <button className="button button--secondary" onClick={handleEndRound}>End Round</button>}` in the button-row
- [ ] T012 [US1] Run `cd backend && npm test` — verify all US1 unit + integration tests pass (GREEN)
- [ ] T013 [US1] Run `cd frontend && npx playwright test result.spec.ts --grep "End Round"` — verify US1 E2E tests pass (GREEN)

**Checkpoint**: Host clicks "End Round" → room.status = "result". Guesser detects within 2500ms. Backend unit + integration 100% GREEN.

---

## Phase 3: User Story 2 — Result State Shows All Round Data (Priority: P1)

**Goal**: All players see the secret word, final scores, and complete guess history in the result view.

**Independent Test**: After round ends, both host and guesser screens show "rocket", all participant scores, and all guesses.

**Dependencies**: US1 MUST be complete — result status must exist before result view can be tested.

### Tests for US2 (TDD — write FIRST)

- [ ] T014 [P] [US2] Extend `backend/tests/integration/rooms.test.ts`: write integration test — `GET /rooms/:code?participantId=guestId` in result status → response.room.word = "rocket" (word visible to non-host in result) — **Note**: this test may already be GREEN after T008 (US1) since T008 implements the word-visibility logic; unit-level coverage is in T003(d). Confirm state: if GREEN, record it as expected and proceed; if RED, T008 was incomplete — fix before moving to T016
- [ ] T015 [US2] Add failing E2E tests to `frontend/tests/e2e/result.spec.ts`: (a) after host ends round, host sees word "rocket" on screen; (b) after host ends round, guesser sees word "rocket" on screen; (c) result view shows all participant scores and guess history

### Implementation for US2

> **NOTE**: Implement AFTER T014, T015 confirmed failing

- [ ] T016 [US2] Add result view to `frontend/src/pages/GamePage.tsx`: add `{room.status === "result" && (<section aria-label="Round results"><h2>Round Over!</h2><p>The secret word was: <strong>{room.word}</strong></p><Scoreboard participants={room.participants} /><ResultPanel guesses={room.guesses} /></section>)}` — render this block ABOVE the canvas area — **SEQUENTIAL after T011** (same file)
- [ ] T017 [US2] Run `cd backend && npm test && cd ../frontend && npx playwright test result.spec.ts` — verify US2 backend + E2E tests pass (GREEN)

**Checkpoint**: All players see secret word, scores, and guess history in result view. Word "rocket" confirmed visible to guesser in result status.

---

## Phase 4: User Story 3 — Host Restarts the Game (Priority: P1)

**Goal**: Host clicks "Play Again" → room returns to lobby with all participants preserved and round state cleared.

**Independent Test**: Host restarts → host navigates to lobby immediately. Guesser navigates to lobby within 2500ms. Lobby shows all participants with scores = 0.

**Dependencies**: US2 MUST be complete — "Play Again" button is part of the result view (same GamePage.tsx).

### Tests for US3 (TDD — write FIRST)

- [ ] T018 [P] [US3] Extend `backend/tests/unit/roomStore.test.ts`: failing unit tests for `restartGame()`: (a) host → status = "lobby", scores = 0, guesses = [], strokes = []; (b) non-host → `{ error: "not_host" }`; (c) wrong status (not result) → `{ error: "not_in_result" }`
- [ ] T019 [P] [US3] Extend `backend/tests/integration/rooms.test.ts`: failing integration tests for `POST /rooms/:code/restart`: (a) host → 200, status = "lobby", scores = 0; (b) guest → 403; (c) wrong status → 409
- [ ] T020 [US3] Add failing E2E tests to `frontend/tests/e2e/result.spec.ts`: (a) host sees "Play Again" button in result view; guesser does not; (b) host clicks "Play Again" → navigates to lobby; (c) guesser navigates to lobby within 2500ms; (d) lobby shows all participants with scores = 0

### Implementation for US3

> **NOTE**: Implement AFTER T018, T019, T020 confirmed failing

- [ ] T021 [US3] Add `restartGameSchema` to `backend/src/api/schemas.ts`: `z.object({ participantId: z.string().trim().min(1, "Participant ID is required") })`
- [ ] T022 [US3] Implement `restartGame(code, participantId)` in `backend/src/services/roomStore.ts`: validate host (403), validate result status (409), set `room.status = "lobby"`, clear `room.word`, clear `room.drawerParticipantId`, set `room.guesses = []`, set `room.strokes = []`, reset all `participant.score = 0`, return `{ room: cloneRoom(room) }`
- [ ] T023 [US3] Add `POST /:code/restart` route to `backend/src/api/rooms.ts`: parse with `roomCodeParamsSchema` + `restartGameSchema`; call `restartGame()`; map `not_host` → 403, `not_in_result` → 409, `not_found` → 404; return `response.json({ room: toRoomSnapshot(result.room, participantId) })`
- [ ] T024 [P] [US3] Add `restartGame()` method to `RoomStore` class in `frontend/src/state/roomStore.ts`: calls `api.restartGame(room.code, participantId)`; calls `setRoomSnapshot(response.room)` on success
- [ ] T025 [US3] Add "Play Again" button and `handleRestart()` handler to `frontend/src/pages/GamePage.tsx`: inside the result view block added in T016, add `{room.isHost && <button className="button button--primary" onClick={handleRestart}>Play Again</button>}` — **SEQUENTIAL after T016** (same file); add `async function handleRestart() { await roomStore.restartGame().catch(() => {}); }`
- [ ] T026 [US3] Update `frontend/src/pages/LobbyPage.tsx`: extend the `in_game` redirect to also redirect on `result` status — change `room.status === "in_game"` to `room.status === "in_game" || room.status === "result"` in the redirect `useEffect`
- [ ] T027 [US3] Run `cd backend && npm test` — verify all US3 unit + integration tests pass (GREEN)
- [ ] T028 [US3] Run `cd frontend && npx playwright test result.spec.ts` — verify all E2E tests in result.spec.ts pass (GREEN)

**Checkpoint**: Host restarts → lobby status. Guesser redirects to lobby within 2500ms. Scores = 0. All participants preserved.

---

## Phase 5: Polish

- [ ] T029 [P] Full backend regression — verify no cross-story regressions: `cd backend && npm test`
- [ ] T030 [P] Full frontend unit regression: `cd frontend && npm test`
- [ ] T031 Run full Playwright E2E suite: `cd frontend && npx playwright test`
- [ ] T032 ESLint both packages: `cd backend && npm run lint && cd ../frontend && npm run lint`
- [ ] T033 TypeScript build validation: `cd backend && npm run build && cd ../frontend && npm run build`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: Start immediately — T001 → T002 (parallel)
- **US1 (Phase 2)**: After Foundational — BLOCKS US2 and US3
- **US2 (Phase 3)**: After US1 complete — BLOCKS US3 (GamePage.tsx conflict)
- **US3 (Phase 4)**: After US2 complete — GamePage.tsx T025 must follow T016
- **Polish (Phase 5)**: After all user stories complete

### Strict Sequential Constraints

1. T007 → T008 (both modify `roomStore.ts`)
2. T011 → T016 → T025 (all modify `GamePage.tsx` — strictly sequential)
3. T022 → T023 (backend service → route, `rooms.ts`)

### Parallel Opportunities

```bash
# Foundational
T001 + T002  (different files)

# US1 test writing (all different files)
T003 + T004 + T005

# US1 implementation: backend chain then frontend
T006 → T007 → T008 → T009  (sequential, same files)
T010 parallel with T006-T009  (state/roomStore.ts independent)

# US2 test writing
T014 + T015  (backend vs E2E)

# US3 test writing
T018 + T019  (unit vs integration)

# US3 implementation
T021 → T022 → T023  (sequential, backend)
T024 parallel with T021-T023  (frontend state)

# Polish
T029 + T030 + T032  (parallel)
```

---

## Implementation Strategy

### MVP (US1 Only — End Round)

1. Foundational (T001–T002)
2. US1 (T003–T013)
3. **VALIDATE**: Backend tests pass; host can end round; guesser detects result within 2500ms

### Incremental Delivery

1. Foundational → Types ready
2. US1 → Host ends round; result status detectable ✅
3. US2 → Result view shows word, scores, history to all ✅
4. US3 → Restart works; lobby restored with clean state ✅
5. Polish → Regression clean; lint/build pass

---

## Notes

- TDD mandatory per constitution: write failing tests BEFORE implementation
- T011, T016, T025 ALL modify `GamePage.tsx` — strictly sequential in that order
- T007 and T008 both modify `roomStore.ts` — T008 MUST follow T007
- The `result.spec.ts` E2E file is new — accumulates test cases across US1/US2/US3
- The existing E2E suites (game.spec.ts, gameplay.spec.ts, etc.) MUST all still pass in T031
- Commit after each user story checkpoint (T012/T013, T017, T027/T028)
