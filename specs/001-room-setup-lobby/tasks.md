---
description: "Task list for Room Setup & Lobby feature implementation"
---

# Tasks: Room Setup & Lobby

**Input**: Design documents from `/specs/001-room-setup-lobby/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/rooms-api.md ✅

**Tests**: Required per constitution Principle II — TDD (Red → Green) for unit/integration; E2E via Playwright.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared-state dependency)
- **[Story]**: Which user story this task belongs to (US1–US4)
- All tasks include exact file paths

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Test directory structure, Playwright, and ESLint — required before any test or lint task.

- [X] T001 Create backend test directories `backend/tests/unit/` and `backend/tests/integration/`
- [X] T002 [P] Create frontend test directories `frontend/tests/unit/` and `frontend/tests/e2e/`
- [X] T003 [P] Install Playwright and axe-core: `cd frontend && npm install -D @playwright/test @axe-core/playwright && npx playwright install chromium`; create `frontend/playwright.config.ts` with `baseURL: "http://localhost:5173"` and `webServer` entries for backend (port 3001) and frontend (port 5173)
- [X] T004 [P] Install ESLint in both packages: `cd backend && npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin` and `cd frontend && npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin`; add `"lint": "eslint src --ext .ts,.tsx"` scripts to `backend/package.json` and `frontend/package.json`; create `backend/.eslintrc.json` and `frontend/.eslintrc.json` each extending `@typescript-eslint/recommended` with `no-explicit-any: error`

**Checkpoint**: `frontend/playwright.config.ts` exists; `frontend/node_modules/@playwright` is present; test directories created; `npm run lint` executes without config errors in both packages.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data model changes that ALL user stories depend on. No user story can start until these are complete.

**⚠️ CRITICAL**: All four user story phases depend on the type changes made here.

- [X] T005 Add `hostId: string` field to `Room` interface and `isHost: boolean` field to `RoomSnapshot` interface in `backend/src/models/game.ts`
- [X] T006 [P] Add `isHost: boolean` field to `RoomSnapshot` interface in `frontend/src/services/api.ts`

**Checkpoint**: `tsc --noEmit` passes in both `backend/` and `frontend/` with the new fields present.

---

## Phase 3: User Story 1 — Host Identification on Room Creation (Priority: P1) 🎯 MVP

**Goal**: Creator of a room is automatically the host; `isHost: true` in their snapshot, `false` for all other participants.

**Independent Test**: POST /api/rooms → response.room.isHost === true. POST /api/rooms/:code/join → response.room.isHost === false.

### Tests for User Story 1 (TDD — write FIRST, verify they FAIL before implementation)

- [X] T007 [P] [US1] Write failing unit tests for `createRoom()` host assignment (assert `room.hostId === participant.id`) and for `toRoomSnapshot()` returning `isHost: true` for creator and `isHost: false` for any other participantId in `backend/tests/unit/roomStore.test.ts`
- [X] T008 [P] Write integration test helper that starts `createApp()` on a random port and exposes `baseUrl` in `backend/tests/integration/helpers.ts` — shared across all integration test files, not story-specific; runs in parallel with T007 since files are independent
- [X] T009 [US1] Write failing integration tests: POST /api/rooms returns `room.isHost === true`; GET /api/rooms/:code with joinerId returns `isHost: false`; GET without participantId returns `isHost: false` in `backend/tests/integration/rooms.test.ts`

### Implementation for User Story 1

> **NOTE**: Implement AFTER T007 tests are confirmed failing

- [X] T010 [US1] Set `room.hostId = participant.id` inside `createRoom()` and replace `void viewerParticipantId` with `isHost: viewerParticipantId === room.hostId` inside `toRoomSnapshot()` in `backend/src/services/roomStore.ts`
- [X] T011 [US1] Run `cd backend && npm test` and verify all US1 unit and integration tests pass (GREEN)

**Checkpoint**: Two participants join the same room; creator's snapshot has `isHost: true`; joiner's snapshot has `isHost: false`.

---

## Phase 4: User Story 2 — Input Validation on Create and Join (Priority: P1)

**Goal**: Blank or whitespace-only player names and room codes are rejected with specific error messages — both client-side (before API call) and server-side (400 response). Error messages meet WCAG 2.1 AA via `aria-describedby` associations.

**Independent Test**: Submit Create Room with blank name → inline error visible, URL unchanged, zero API calls. POST /api/rooms with blank name → 400 "Player name is required".

### Tests for User Story 2 (TDD — write FIRST, verify they FAIL before implementation)

- [X] T012 [P] [US2] Write failing unit tests for Zod schema validation: `createRoomSchema.parse({playerName: ""})` throws, `parse({playerName: "  "})` throws with "Player name is required", `parse({playerName: "  Alice  "})` succeeds and trims to "Alice" in `backend/tests/unit/schemas.test.ts`
- [X] T013 [P] [US2] Write failing unit tests for frontend pure validation functions: `validatePlayerName("")` → "Player name is required", `validatePlayerName("  ")` → "Player name is required", `validatePlayerName("Alice")` → null, `validateRoomCode("")` → "Room code is required", `validateRoomCode("ABCD")` → null in `frontend/tests/unit/validation.test.ts`
- [X] T014 [P] [US2] Write failing Playwright E2E tests in `frontend/tests/e2e/validation.spec.ts`: (a) blank name on Create Room → error "Player name is required" visible, URL stays `/create`; (b) blank name on Join Room → error visible, URL stays `/join`; (c) blank code on Join Room → error "Room code is required" visible, URL stays `/join`; (d) valid inputs navigate to `/lobby`

### Implementation for User Story 2

> **NOTE**: Implement AFTER T012, T013, T014 tests are confirmed failing

- [X] T015 [US2] Update `createRoomSchema` and `joinRoomSchema` to `z.string().trim().min(1, "Player name is required")` in `backend/src/api/schemas.ts` — `.trim()` handles whitespace-only values; Express routing naturally prevents absent path segments from reaching schema validation
- [X] T016 [US2] Update `roomCodeParamsSchema` to `z.string().trim().min(1, "Room code is required")` in `backend/src/api/schemas.ts`
- [X] T017 [US2] Update the ZodError branch in `errorHandler` in `backend/src/api/router.ts` to `import { ZodError } from "zod"` and return `{ message: (error as ZodError).issues[0]?.message ?? "Invalid request payload" }`
- [X] T018 [US2] Create `frontend/src/utils/validation.ts` exporting `validatePlayerName(name: string): string | null` and `validateRoomCode(code: string): string | null` as pure functions
- [X] T019 [US2] Add on-submit validation to `frontend/src/pages/CreateRoomPage.tsx`: call `validatePlayerName(playerName)`; if non-null, set error state and return early; add `id="create-error"` to the error `<p>` element and `aria-describedby="create-error"` to the player name `<input>` so screen readers associate the error with the field
- [X] T020 [US2] Add on-submit validation to `frontend/src/pages/JoinRoomPage.tsx`: call `validatePlayerName` and `validateRoomCode` on submit; set error state and return early if either returns non-null; add `id="join-error"` to the error `<p>` element and `aria-describedby="join-error"` to the input whose value triggered the error
- [X] T021 [US2] Extend `backend/tests/integration/rooms.test.ts` (do not overwrite T009 content) with additional test cases: blank name → 400 "Player name is required"; whitespace-only name → 400; blank code → 400 "Room code is required"
- [X] T022 [US2] Run `cd backend && npm test && cd ../frontend && npm test` and verify all US2 unit and integration tests pass (GREEN)
- [X] T023 [US2] Run `cd frontend && npx playwright test validation.spec.ts` and verify all US2 E2E tests pass (GREEN)

**Checkpoint**: Blank name on Create Room shows inline error with no API call; blank code on Join Room shows inline error; POST /api/rooms with blank name returns 400 "Player name is required"; error `<p>` elements are linked to their inputs via `aria-describedby`.

---

## Phase 5: User Story 3 — Host-Only Start Game Button (Priority: P2)

**Goal**: "Start Game" button renders only for the host; disabled when fewer than 2 players; no-op when clicked.

**Independent Test**: Open lobby as host (1 player) → button visible but disabled. Second player joins → button enabled. Open lobby as non-host → no button rendered.

**Dependencies**: Requires US1 complete (needs `room.isHost` in snapshot).

### Tests for User Story 3 (TDD — write E2E tests FIRST)

- [X] T024 [P] [US3] Write failing E2E tests in `frontend/tests/e2e/lobby.spec.ts`: (a) host with 1 player sees disabled "Start Game"; (b) after second player joins, host sees enabled "Start Game"; (c) non-host tab has no "Start Game" button; (d) clicking enabled "Start Game" causes no navigation

### Implementation for User Story 3

> **NOTE**: Implement AFTER T024 tests are confirmed failing

- [X] T025 [US3] Update `frontend/src/pages/LobbyPage.tsx`: wrap the "Start Game" button in `{room.isHost && (...)}` for conditional render; set `disabled={room.participants.length < 2}`; replace `onClick={() => navigate("/game")}` with a no-op `onClick={() => {}}`
- [X] T026 [US3] Run `cd frontend && npx playwright test --grep "Start Game"` and verify US3 E2E tests pass (GREEN)

**Checkpoint**: Two browser tabs open to the same lobby; host tab shows enabled "Start Game"; guest tab shows no button.

---

## Phase 6: User Story 4 — Automatic Lobby Polling (Priority: P2)

**Goal**: Lobby auto-refreshes participant list every 2 seconds; new joiners appear without manual action; polling stops on navigation; poll errors are silently swallowed.

**Independent Test**: Tab A in lobby, Tab B joins from a separate tab → Tab A shows Tab B's name within one poll cycle (~2 s) without any manual action.

**Dependencies**: Requires US1 complete; sequential after US3 since both modify `frontend/src/pages/LobbyPage.tsx`.

### Tests for User Story 4 (TDD — write E2E tests FIRST)

- [X] T027 [P] [US4] Add failing E2E test to the existing `frontend/tests/e2e/lobby.spec.ts` created in T024 (do not overwrite US3 tests): Tab A creates room; Tab B joins; verify Tab A shows Tab B's name within 2 500 ms (one full poll cycle + 500 ms grace) without any manual action — aligns with SC-001 "within one poll cycle (~2 s)"

### Implementation for User Story 4

> **NOTE**: Implement AFTER T027 test is confirmed failing

- [X] T028 [US4] Add `useEffect` hook to `frontend/src/pages/LobbyPage.tsx`: `setInterval(() => { roomStore.fetchRoom().catch(() => {}); }, 2000)` with `() => clearInterval(id)` cleanup; place after the existing redirect effect
- [X] T029 [US4] Run `cd frontend && npx playwright test` and verify all E2E tests pass including US4 polling test (GREEN)

**Checkpoint**: Open lobby in Tab A; join from Tab B; within 2 500 ms Tab A shows both participants — no button click required.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Full regression suite, accessibility scan, lint, and build validation across all stories.

- [X] T030 [P] Run full backend test suite — regression check confirming no cross-story breakage after all phases merged: `cd backend && npm test`
- [X] T031 [P] Run full frontend unit test suite — regression check: `cd frontend && npm test`
- [X] T032 Run full Playwright E2E suite: `cd frontend && npx playwright test`
- [X] T033 Write `frontend/tests/e2e/a11y.spec.ts` using `@axe-core/playwright` (installed in T003) to scan Create Room, Join Room, and Lobby pages; assert zero violations; then run `cd frontend && npx playwright test a11y.spec.ts` and verify zero violations — satisfies Constitution Principle V and Constitution Check Gate 5
- [X] T034 Run ESLint in both packages and fix any reported errors: `cd backend && npm run lint && cd ../frontend && npm run lint`
- [X] T035 Run TypeScript build validation in both packages: `cd backend && npm run build && cd ../frontend && npm run build`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion
- **US1 (Phase 3)**: Depends on Phase 2 — no dependency on US2/US3/US4
- **US2 (Phase 4)**: Depends on Phase 2 — no dependency on US1/US3/US4 (run after US1 to avoid integration test file conflicts)
- **US3 (Phase 5)**: Depends on Phase 2 + US1 complete (needs `isHost` in live snapshot)
- **US4 (Phase 6)**: Depends on Phase 2 + US1 complete; sequential after US3 (both modify `LobbyPage.tsx`)
- **Polish (Phase 7)**: Depends on all user story phases complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no inter-story dependency
- **US2 (P1)**: Can start after Foundational — different files from US1 except integration test file
- **US3 (P2)**: Must start after US1 (needs `room.isHost` working end-to-end)
- **US4 (P2)**: Must start after US1 and after US3 (`LobbyPage.tsx` changes must not conflict)

### Within Each User Story

1. Write failing tests (RED) — confirm they fail before implementing
2. Implement the feature (GREEN) — make tests pass
3. Run the story's test command to confirm green
4. Commit before moving to next story

### Parallel Opportunities

```bash
# Phase 1: all four setup tasks in parallel
T001 + T002 + T003 + T004

# Phase 2: T005 and T006 are in different files
T005 (backend/src/models/game.ts) + T006 (frontend/src/services/api.ts)

# US1: T007 and T008 write to different files — run in parallel
# T009 depends on T008 (needs helpers.ts) — must wait for T008
T007 + T008 → (T008 complete) → T009 → T010 → T011

# US2: write all three test suites in parallel before implementing
T012 + T013 + T014 → then T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023

# US3: write E2E in parallel (T024 can start while US1 is being reviewed)
T024 → then T025 → T026

# US4: T027 can overlap with US3 review
T027 → then T028 → T029

# Polish: T030 and T031 in parallel
T030 + T031 → then T032 → T033 → T034 → T035
```

---

## Implementation Strategy

### MVP (User Story 1 Only — Host Tracking)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (type changes)
3. Complete Phase 3: US1 (hostId + isHost)
4. **STOP and VALIDATE**: Run `cd backend && npm test`; POST /api/rooms returns `isHost: true`
5. Ship if host identification is the only required increment

### Incremental Delivery

1. Setup + Foundational → Types ready
2. US1 → Creator is host; `isHost` in all snapshots ✅
3. US2 → Blank inputs rejected client + server + WCAG a11y error associations ✅
4. US3 → Start Game button visible to host only, gated on 2 players ✅
5. US4 → Lobby auto-polls every 2 s ✅
6. Polish → Regressions clean; a11y scan zero violations; lint zero errors; builds pass

### Parallel Team Strategy

With two developers after Foundational phase:
- Developer A: US1 (backend service + tests)
- Developer B: US2 (schemas + frontend validation + tests + E2E)
- After both complete: Developer A or B: US3 → US4 (sequential on LobbyPage.tsx)

---

## Notes

- `[P]` tasks involve different files with no shared in-flight dependency
- TDD is mandatory per constitution Principle II: tests MUST fail before implementation
- `LobbyPage.tsx` is shared by US3 and US4 — implement US3 fully before starting US4
- Playwright `playwright.config.ts` `webServer` config auto-starts both servers for E2E
- Do not remove the manual "Refresh Room" button — polling is additive
- `.trim()` in Zod schemas handles whitespace-only values; Express routing prevents absent path segments from reaching schema validation (see contracts/rooms-api.md for detail)
- `aria-describedby` on error-associated inputs is mandatory per constitution Principle V (WCAG 2.1 AA)
- Commit after each user story checkpoint (T011, T023, T026, T029)
