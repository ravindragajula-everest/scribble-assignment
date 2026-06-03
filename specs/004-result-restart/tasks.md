---
description: "Task list for Result, Restart & Final Validation — Host-Only Exit Game"
---

# Tasks: Result, Restart & Final Validation — Host-Only Exit Game

**Input**: Design documents from `/specs/004-result-restart/` (host-only Exit Game amendment)
**Prerequisites**: plan.md ✅, spec.md ✅

**Context**: All previous amendments are implemented. This file covers the final micro-amendment:
"Exit Game" button is visible ONLY to the host (FR-014 updated; FR-015 removed).

**Status**: **All tasks already implemented** during the clarification session.

## Format: `[ID] [P?] [Story?] Description`

---

## Phase 1: User Story 3 — Exit Game Host-Only (Priority: P1)

**Goal**: Remove "Exit Game" button visibility from guessers. Button is shown only when `room.isHost`.

**Independent Test**: Host sees "Exit Game" button on Game screen; guesser does NOT.

### Implementation (already done)

- [X] T001 [US3] Wrap "Exit Game" button in `{room.isHost && (...)}` in `frontend/src/pages/GamePage.tsx` — button completely hidden from non-host players
- [X] T002 [US3] Update `frontend/tests/e2e/result.spec.ts`: replace "guesser clicks Exit Game" test with "Exit Game button is NOT visible to guesser (host only)" assertion using `not.toBeVisible()`

### Validation (already done)

- [X] T003 Run `cd frontend && npx playwright test result.spec.ts` — all 19 tests pass
- [X] T004 Run `cd frontend && npx tsc --noEmit` — no TypeScript errors
- [X] T005 Run `cd frontend && npm run lint` — no ESLint errors

---

## Polish

- [X] T006 [P] Full backend regression: `cd backend && npm test` — 80/80 pass
- [X] T007 [P] Full Playwright suite: `cd frontend && npx playwright test` — 53/53 pass

---

## Notes

- This was a one-line implementation change applied during the clarification session
- All tasks are pre-completed — no further implementation required
- Commit artifact changes via `/speckit-git-commit` before closing the branch
