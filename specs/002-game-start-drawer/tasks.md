---
description: "Task list for Game Start & Drawer Flow feature implementation"
---

# Tasks: Game Start & Drawer Flow

**Input**: Design documents from `/specs/002-game-start-drawer/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/rooms-api.md ✅

**Tests**: Required per constitution Principle II — TDD (Red → Green) for unit/integration; E2E via Playwright.

**Organization**: Tasks are grouped by user story. US2 depends on US1 (game must be startable to test auto-navigate). US3 depends on US1 (game must be started to show game screen content). All are sequential.

**Note**: No Phase 1 Setup needed — test directories, Playwright, ESLint, and Vitest are all installed from feature 001.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no shared-state dependency)
- **[Story]**: Which user story this task belongs to (US1–US3)
- All tasks include exact file paths

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Type system changes that ALL user stories depend on. No story can start until these compile cleanly.

**⚠️ CRITICAL**: All three user story phases depend on the type changes made here.

- [X] T001 Add `"in_game"` to `RoomStatus` union; add `word?: string` and `drawerParticipantId?: string` to `Room` interface; add `word?: string` and `drawerParticipantId?: string` to `RoomSnapshot` interface in `backend/src/models/game.ts`
- [X] T002 [P] Update `RoomSnapshot` interface in `frontend/src/services/api.ts`: change `status` to `"lobby" | "in_game"`, add `word?: string` and `drawerParticipantId?: string` fields

**Checkpoint**: `tsc --noEmit` passes in both `backend/` and `frontend/` with new fields present (optional fields do not break existing tests).

---

## Phase 2: User Story 1 — Host Starts the Game (Priority: P1) 🎯 MVP

**Goal**: Host clicks enabled "Start Game" button → backend transitions room to in_game → host navigates to `/game`.

**Independent Test**: POST /rooms/:code/start with valid host participantId → 200, room.status = "in_game". Host's UI navigates to /game on success. Error shown in Lobby on failure.

### Tests for User Story 1 (TDD — write FIRST, verify they FAIL before implementation)

- [X] T003 [P] [US1] Write failing unit tests for `startGame()` in `backend/tests/unit/roomStore.test.ts`: (a) valid host call → status "in_game", word "rocket", drawerParticipantId = hostId; (b) guest call → `{ error: "not_host" }`; (c) already-started room → `{ error: "already_started" }`; (d) `toRoomSnapshot()` with in_game room + hostId → word: "rocket", drawerParticipantId present; (e) `toRoomSnapshot()` with in_game room + guestId → no word key, drawerParticipantId present; (f) `toRoomSnapshot()` with lobby room → no word, no drawerParticipantId (backward compat) — **Note**: tests (a)–(c) turn GREEN after T007; tests (d)–(f) turn GREEN after T008. All tests should be confirmed RED before starting T007.
- [X] T004 [P] [US1] Write failing integration tests for the start endpoint by extending `backend/tests/integration/rooms.test.ts` (do not overwrite existing content): (a) `POST /rooms/:code/start` valid host → 200, room.status = "in_game"; (b) host snapshot after start includes word = "rocket"; (c) guest snapshot after start has no `word` key; (d) guest participantId → 403; (e) already-started room → 409
- [X] T005 [P] [US1] Write failing E2E test in `frontend/tests/e2e/game.spec.ts` (new file): host clicks "Start Game" → URL becomes `/game`; also write: host clicks "Start Game" on already-started room → inline error appears in Lobby below button, URL stays `/lobby`

### Implementation for User Story 1

> **NOTE**: Implement AFTER T003, T004, T005 tests are confirmed failing

- [X] T006 [US1] Add `startGameSchema` to `backend/src/api/schemas.ts`: `z.object({ participantId: z.string().trim().min(1, "Participant ID is required") })`
- [X] T007 [US1] Implement `startGame(code, participantId)` in `backend/src/services/roomStore.ts` — returns discriminated union `{ error: "not_found"|"already_started"|"not_host" }` or `{ room: Room }` — sets `status: "in_game"`, `word: STARTER_WORDS[0]`, `drawerParticipantId: room.hostId`
- [X] T008 [US1] Update `toRoomSnapshot()` in `backend/src/services/roomStore.ts`: spread `drawerParticipantId` when `in_game`; spread `word` only when viewer is the drawer (`viewerParticipantId === room.drawerParticipantId && status === "in_game"`)
- [X] T009 [US1] Add `POST /:code/start` route handler to `backend/src/api/rooms.ts`: parse params with `roomCodeParamsSchema`, body with `startGameSchema`, call `startGame()`, map errors to 404/409/403 `HttpError`, return `{ room: toRoomSnapshot(result.room, participantId) }`
- [X] T010 [P] [US1] Add `startGame(code, participantId)` method to `api` object in `frontend/src/services/api.ts`: `POST /rooms/:code/start` with `{ participantId }` body, returns `{ room: RoomSnapshot }`
- [X] T011 [US1] Add `startGame()` method to `RoomStore` class in `frontend/src/state/roomStore.ts`: calls `api.startGame(room.code, participantId)`, calls `setRoomSnapshot(response.room)`, throws on error (no `withLoading` — follows `fetchRoom()` pattern)
- [X] T012 [US1] Update `frontend/src/pages/LobbyPage.tsx`: add `startError` state; add `handleStartGame()` that calls `roomStore.startGame()`, navigates to `/game` on success, sets `startError` on failure; replace no-op `onClick` with `handleStartGame`; render `{startError && <p id="start-error" className="form__error" aria-live="polite">{startError}</p>}` directly after the "Start Game" button
- [X] T013 [US1] Run `cd backend && npm test` and verify all US1 unit and integration tests pass (GREEN)
- [X] T014 [US1] Run `cd frontend && npx playwright test game.spec.ts` and verify US1 E2E tests pass (GREEN)

**Checkpoint**: Host clicks "Start Game" → navigates to `/game`. POST /rooms/:code/start returns 200 with room.status = "in_game". Guest snapshot has no `word`. Inline error appears on 409.

---

## Phase 3: User Story 2 — Non-Host Players Auto-Navigate to Game Screen (Priority: P1)

**Goal**: Non-host players on Lobby detect room status change via existing 2-second polling and automatically navigate to `/game`. Direct `/game` navigation before game starts redirects to `/lobby` or `/`.

**Independent Test**: Host starts game from Tab A. Tab B (non-host) navigates to `/game` within 2500ms without any manual action. Direct `/game` navigation before start → redirect.

**Dependencies**: Requires US1 complete (game must be startable to test status detection).

### Tests for User Story 2 (TDD — write FIRST, verify they FAIL before implementation)

- [X] T015 [US2] Add failing E2E tests to existing `frontend/tests/e2e/game.spec.ts`: (a) non-host auto-navigates to `/game` within 2500ms of host starting; (b) direct navigation to `/game` before game starts (room in lobby) → redirects to `/lobby`; (c) direct navigation to `/game` with no room in session → redirects to `/`

### Implementation for User Story 2

> **NOTE**: Implement AFTER T015 tests are confirmed failing

- [X] T016 [US2] Update the redirect `useEffect` in `frontend/src/pages/LobbyPage.tsx` to add `else if (room.status === "in_game") navigate("/game", { replace: true })` after the existing `!room` guard — the dependency array must include `room` (already present)
- [X] T017 [US2] Update `frontend/src/pages/GamePage.tsx`: extend the existing redirect `useEffect` to add `else if (room.status === "lobby") navigate("/lobby", { replace: true })`; update the early-return guard from `if (!room) return null` to `if (!room || room.status !== "in_game") return null`
- [X] T018 [US2] Run `cd frontend && npx playwright test game.spec.ts` and verify US2 E2E tests pass (GREEN)

**Checkpoint**: Tab B (non-host on Lobby) automatically navigates to `/game` within 2500ms after host starts. Direct `/game` URL with lobby-status room → `/lobby`.

---

## Phase 4: User Story 3 — Drawer and Word Visibility on Game Screen (Priority: P1)

**Goal**: Game screen shows role ("Drawer" or "Guesser") and drawer's name to all players. Secret word visible only to the drawer (host).

**Independent Test**: Host on `/game` sees "rocket". Non-host on `/game` does NOT see "rocket" anywhere on the page. Drawer's name visible to both.

**Dependencies**: Requires US1 complete (game must be started to have a drawer and word assigned).

### Tests for User Story 3 (TDD — write FIRST, verify they FAIL before implementation)

- [X] T019 [US3] Add failing E2E tests to existing `frontend/tests/e2e/game.spec.ts`: (a) host on `/game` sees text "rocket" on the page; (b) host on `/game` sees role label "Drawer"; (c) non-host on `/game` does NOT see "rocket" anywhere on page; (d) non-host on `/game` sees role label "Guesser"; (e) both host and non-host see the drawer's name ("Alice") on the Game screen; also add axe-core a11y scan for the Game screen to `frontend/tests/e2e/a11y.spec.ts` (extend existing file): navigate to `/game` after host starts, assert zero WCAG 2.1 AA violations

### Implementation for User Story 3

> **NOTE**: Implement AFTER T019 tests are confirmed failing

- [X] T020 [US3] Update `frontend/src/pages/GamePage.tsx`: compute `drawerName` from `room.participants.find(p => p.id === room.drawerParticipantId)?.name ?? "Unknown"`; add role (`room.isHost ? "Drawer" : "Guesser"`), drawer name, and conditional word display (`room.isHost && room.word`) to the existing "Player Info" Card; the word `<dd>` element MUST have `aria-label="Secret word"` for screen reader clarity
- [X] T021 [US3] Run `cd frontend && npx playwright test game.spec.ts` and verify all US3 E2E tests pass (GREEN)

**Checkpoint**: Host on Game screen sees "Drawer", "Alice", and "rocket". Non-host sees "Guesser", "Alice", and NO "rocket" anywhere. Confirmed via Playwright and manual DevTools network inspection.

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Full regression, accessibility scan, lint, and build validation after all stories complete.

- [X] T022 [P] Run full backend test suite — regression check after all stories: `cd backend && npm test`
- [X] T023 [P] Run full frontend unit test suite — regression check: `cd frontend && npm test`
- [X] T024 Run full Playwright E2E suite (all spec files): `cd frontend && npx playwright test`
- [X] T025 Run the Game screen a11y test (written in T019): `cd frontend && npx playwright test a11y.spec.ts` and verify zero WCAG 2.1 AA violations
- [X] T026 Run ESLint in both packages: `cd backend && npm run lint && cd ../frontend && npm run lint`
- [X] T027 Run TypeScript build validation in both packages: `cd backend && npm run build && cd ../frontend && npm run build`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Foundational (Phase 1)**: No dependencies — start immediately
- **US1 (Phase 2)**: Depends on Foundational completion — BLOCKS US2 and US3
- **US2 (Phase 3)**: Depends on US1 complete (game must be startable to test status detection)
- **US3 (Phase 4)**: Depends on US1 complete (game must be started to have word/drawer assigned)
- **Polish (Phase 5)**: Depends on all user stories complete

### User Story Dependencies

- **US1 (P1)**: Start after Foundational — no inter-story dependency
- **US2 (P1)**: Must start after US1 — needs `POST /rooms/:code/start` working to test detection
- **US3 (P1)**: MUST start after US2 — both modify `GamePage.tsx` (US2 adds the redirect guard, US3 adds display logic); running them concurrently causes merge conflicts.

### Within Each User Story

1. Write failing tests (RED) — confirm they fail before implementing
2. Implement the feature (GREEN) — make tests pass
3. Run the story's test command to confirm green
4. Commit before moving to next story

### Parallel Opportunities

```bash
# Foundational: T001 and T002 write to different files
T001 (backend/src/models/game.ts) + T002 (frontend/src/services/api.ts)

# US1 test writing: T003, T004, T005 write to different files
T003 (roomStore.test.ts) + T004 (rooms.test.ts) + T005 (game.spec.ts)

# US1 implementation: T010 writes to api.ts independently of T006-T009
T006 → T007 → T008 → T009 (sequential, same service layer)
T010 (api.ts) can run in parallel with T006-T009

# Polish: T022 and T023 run in different directories
T022 (backend npm test) + T023 (frontend npm test)
```

---

## Implementation Strategy

### MVP (User Story 1 Only — Host Starts the Game)

1. Complete Phase 1: Foundational (type changes)
2. Complete Phase 2: US1 (backend endpoint + LobbyPage wiring)
3. **STOP and VALIDATE**: `cd backend && npm test` passes; host navigates to `/game` after clicking "Start Game"
4. Deploy/demo MVP if needed

### Incremental Delivery

1. Foundational → Types ready
2. US1 → Host can start game, navigates to /game ✅
3. US2 → Non-hosts auto-navigate, redirect guard works ✅
4. US3 → Game screen shows roles, drawer name, word securely ✅
5. Polish → Regression clean, a11y zero violations, lint zero errors, builds pass

---

## Notes

- `[P]` tasks involve different files with no shared in-flight dependency
- TDD is mandatory per constitution Principle II: tests MUST fail before implementation
- `GamePage.tsx` is shared by US2 (redirect logic) and US3 (display logic) — implement US2 fully before starting US3 to avoid conflicts
- The existing `helpers.ts` integration test helper from feature 001 is reused without modification — T004 adds new describe blocks to the existing `rooms.test.ts`
- `game.spec.ts` is a NEW file (not an extension of `lobby.spec.ts`)
- Commit after each user story checkpoint (T013/T014, T018, T021)
- The word "rocket" is used as the literal test assertion — it is deterministic (STARTER_WORDS[0])
