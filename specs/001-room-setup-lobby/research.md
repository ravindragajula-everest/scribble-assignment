# Research: Room Setup & Lobby

**Feature**: 001-room-setup-lobby
**Date**: 2026-06-02
**Status**: Complete — all unknowns resolved from codebase analysis

## Findings

### 1. Host Tracking — `isHost: boolean` in snapshot

**Decision**: Store `hostId: string` on the backend `Room` (internal); surface `isHost: boolean`
in `RoomSnapshot` computed from `viewerParticipantId === room.hostId`.

**Rationale**: `toRoomSnapshot(room, viewerParticipantId)` already receives the viewer's ID
but voids it. Activating this seam for `isHost` computation is the minimum change required.
Exposing raw `hostId` to clients would leak an internal ID and add a client-side comparison
that the server already has the context to make.

**Alternatives considered**:
- Raw `hostId` in snapshot — rejected: exposes internal ID; requires client comparison
- Both `hostId` + `isHost` — rejected: unnecessary data; constitution Principle IV (no duplication)

---

### 2. Input Validation — Zod + ZodError message surfacing

**Decision**: Add `.trim().min(1, "Player name is required")` to Zod schemas. Update
`errorHandler` in `router.ts` to return `error.issues[0]?.message` for ZodErrors instead
of the generic "Invalid request payload".

**Rationale**: Keeps validation logic in Zod (single source of truth). The one-line change
to the error handler propagates field-specific messages to all existing and future endpoints
without per-route try/catch duplication (constitution Principle IV — reuse over repeat).

**Alternatives considered**:
- Manual validation inside route handlers — rejected: duplicates logic per-route
- Custom `HttpError` thrown after parse — rejected: more code than the one-line handler change

---

### 3. Frontend Validation — Pure Utility Functions

**Decision**: Extract `validatePlayerName()` and `validateRoomCode()` into
`frontend/src/utils/validation.ts` as pure functions.

**Rationale**: Pure functions are unit-testable with Vitest without mounting any component
or DOM. Constitution Principle II requires unit tests; pure extraction satisfies this
with zero new dependencies. Both `CreateRoomPage` and `JoinRoomPage` import the same
functions (constitution Principle IV — reuse).

---

### 4. Lobby Polling — `setInterval` + `useEffect` cleanup

**Decision**: Implement polling with `setInterval(fn, 2000)` inside a `useEffect` in
`LobbyPage`. Return `() => clearInterval(id)` as the cleanup.

**Rationale**: Standard React pattern for intervals. Cleanup-on-unmount satisfies FR-008
(polling stops on navigation). Poll failures are silently swallowed (`.catch(() => {})`)
per clarification Q3 (FR-008a). No new library needed.

**Alternatives considered**:
- `setTimeout` recursive loop — rejected: drift under slow networks; harder to cancel cleanly
- Custom `useInterval` hook — rejected: adds abstraction for a single use case (constitution: YAGNI)

---

### 5. Integration Tests — Native `fetch` against `createApp()`

**Decision**: Start the real Express app with `createApp()` on a random port, use
Node 18's built-in `fetch` for HTTP calls in integration tests, tear down after each suite.

**Rationale**: No new packages required. `createApp()` is already exported and testable.
Node 18 includes `fetch` globally. Tests hit the real router and error handler, providing
genuine integration coverage.

---

### 6. E2E Tests — Playwright (new devDependency, justified)

**Decision**: Install `@playwright/test` as a devDependency for E2E tests.

**Rationale**: Constitution Principle II mandates E2E tests covering all four business
scenarios. Scenario 1 (two-browser tab polling) physically requires a browser automation
tool. Playwright is the only tool that can drive two isolated browser contexts in a single
test. It is a devDependency with zero impact on the runtime build.

**Constitution compliance**: Principle IV requires justification for any new package.
This justification is: constitutional mandate (Principle II) for E2E coverage of multi-tab
scenarios that cannot be covered by unit or integration tests.
