# Implementation Plan: Result, Restart & Final Validation (Host-Only Exit Game)

**Branch**: `004-result-restart` | **Date**: 2026-06-02 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-result-restart/spec.md`

## Context

All previous amendments are implemented. This plan covers the final micro-amendment:
**"Exit Game" button is visible ONLY to the host** — guessers do not see it.

**Status**: **Already implemented** in `GamePage.tsx` during the previous session.

## Summary

Wrap the "Exit Game" button in `{room.isHost && (...)}` so it is completely hidden from
non-host players. The button was already calling `roomStore.exitRound()` for the host;
the only change is removing it from the guesser's view.

## Technical Context

**Change scope**: One JSX conditional in one file — `frontend/src/pages/GamePage.tsx`
**New dependencies**: None
**New backend changes**: None

## Constitution Check

All gates pass — this is a UI-only visibility change with no new endpoints or dependencies.

## Phase 1: Design

### Implementation (already done)

**`frontend/src/pages/GamePage.tsx`** — change applied:

```tsx
// Before:
<button className="button button--secondary" onClick={...}>
  Exit Game
</button>

// After (host-only):
{room.isHost && (
  <button className="button button--secondary" onClick={...}>
    Exit Game
  </button>
)}
```

### Test (already done)

**`frontend/tests/e2e/result.spec.ts`** — updated test:

```ts
test("Exit Game button is NOT visible to guesser (host only)", ...) {
  // Host sees "Exit Game"; guesser does NOT
  await expect(hostPage.getByRole("button", { name: "Exit Game" })).toBeVisible();
  await expect(guestPage.getByRole("button", { name: "Exit Game" })).not.toBeVisible();
}
```

### Spec Changes (already done)

- FR-014 updated: "Exit Game button MUST be visible ONLY to the host"
- FR-015 removed (non-host Exit Game behavior eliminated)
- US3 scenario 7 removed
- Edge Cases updated

## Validation

```bash
cd frontend && npx playwright test result.spec.ts  # 19/19 pass
cd backend && npm test                              # 80/80 pass
```
