# Reflection Report — Scribble Lab

**Author**: Ravindra Babu Gajula
**Date**: 2026-06-02
**Branch**: `004-result-restart` (final feature delivered)

---

## What the Starter App Already Had

The starter provided a runnable but intentionally incomplete scaffold for a multiplayer drawing-and-guessing game.

### Backend (Express + TypeScript)
- Express server with CORS and JSON body parsing
- In-memory room store (`Map<string, Room>`) with `createRoom`, `joinRoom`, `getRoom`
- Three working API endpoints: `GET /health`, `POST /rooms`, `POST /rooms/:code/join`, `GET /rooms/:code`
- Basic Zod schemas — `playerName` was **optional** with no trimming or validation
- Seed data: word list `["rocket","pizza","castle","guitar","sunflower"]` and roles `["drawer","guesser"]`
- Vitest configured in both packages

### Frontend (React + Vite + TypeScript)
- Full page routing: Start, Create Room, Join Room, Lobby, Game
- `CreateRoomPage` and `JoinRoomPage` — working forms that called the API and navigated to Lobby
- `LobbyPage` — displayed participants from the last fetched snapshot; had a manual "Refresh Room" button (no auto-polling)
- `GamePage` — placeholder only: static canvas div, no-op `GuessForm`, empty `Scoreboard`, empty `ResultPanel`
- `RoomStore` — client-side store with `createRoom()`, `joinRoom()`, `fetchRoom()` methods using `useSyncExternalStore`
- API base URL defaulted to `http://localhost:3001/bug` (typo in fallback)
- Basic UI styling

### What Was Not Implemented
- Host tracking / host-only controls
- Input validation (blank names were silently accepted)
- Auto-polling on Lobby or Game screens
- Game start flow
- Drawer assignment
- Secret word selection or visibility
- Canvas interaction
- Guess submission (form was a no-op)
- Scoring
- Guess history sync
- Result state
- Restart flow

---

## What We Added

Across four feature groups, the application was built from scaffold to a fully playable game loop.

---

### Feature 001 — Room Setup & Lobby

**Goal**: Host tracking, input validation, host-only Start Game, and automatic lobby polling.

| Area | What was added |
|------|---------------|
| Data model | `hostId: string` on `Room`; `isHost: boolean` on `RoomSnapshot` (computed per viewer) |
| Backend validation | Zod schemas updated: `.trim().min(1, "Player name is required")` on all name/code fields; ZodError handler returns field-specific messages |
| Frontend validation | `validatePlayerName()` and `validateRoomCode()` pure functions; `CreateRoomPage` and `JoinRoomPage` validate on submit with `aria-describedby` accessibility |
| Lobby polling | `setInterval` (2 s) with `clearInterval` cleanup in `LobbyPage` |
| Start Game button | Visible and enabled for host only (≥2 players); no-op click (wired in feature 002) |
| API fix | Base URL fallback corrected; Vite proxy configured |
| Testing | ESLint + Playwright + axe-core installed; unit tests (validation, schemas), integration tests, E2E tests (validation scenarios, lobby polling, a11y) |

---

### Feature 002 — Game Start & Drawer Flow

**Goal**: Start Game triggers a real game state transition; host becomes drawer; word selected.

| Area | What was added |
|------|---------------|
| Data model | `RoomStatus` extended to `"lobby" \| "in_game"`; `word?: string`, `drawerParticipantId?: string` on `Room` and `RoomSnapshot` |
| Backend | `startGame()` service (drawer = host, word = `"rocket"`, 403/409 error handling); `POST /rooms/:code/start`; `toRoomSnapshot()` filters `word` to drawer only during `in_game` |
| Frontend | `api.startGame()`, `RoomStore.startGame()`; `LobbyPage` Start Game button fully wired with error display and navigate; `LobbyPage` detects `in_game` via polling → navigates to `/game` |
| Game screen | `GamePage` redirect guard; shows role (Drawer/Guesser), drawer name, secret word to drawer only; placeholder canvas remains for guessers |
| Testing | `game.spec.ts` — host start game, non-host auto-navigate, word/role visibility |

---

### Feature 003 — Gameplay Interaction

**Goal**: Interactive drawing canvas, guess submission with validation, scoring, and canvas sync to guessers.

| Area | What was added |
|------|---------------|
| Data model | `Guess` entity (`id, participantId, participantName, text, isCorrect, timestamp`); `score: number` on `Participant`; `guesses: Guess[]` and `strokes: Stroke[]` on `Room` and `RoomSnapshot`; `Stroke` entity (`id, points, color, lineWidth`) |
| Backend — guesses | `submitGuess()` (trims, case-insensitive comparison, scores 100 for correct); `POST /rooms/:code/guesses` (403 drawer blocked, 400 empty) |
| Backend — canvas | `addStroke()` and `clearStrokes()` services; `POST /rooms/:code/strokes` and `DELETE /rooms/:code/strokes` (drawer-only) |
| Frontend — guess form | `GuessForm.tsx` replaced stub: validation (`validateGuess()`), API call, immediate feedback via `setRoomSnapshot(response.room)`, `aria-live="polite"` error |
| Frontend — canvas (drawer) | Interactive HTML5 `<canvas>` with mouse events; stroke collected on mouseup and sent to server; "Clear Canvas" calls backend to clear all players |
| Frontend — canvas (guesser) | Read-only `<canvas>` that re-renders all strokes from `room.strokes` on every poll |
| Frontend — display | `Scoreboard` and `ResultPanel` replaced stubs (but reveal gated until End Round — see feature 004) |
| Polling | `GamePage` 2-second `setInterval` polling |
| Testing | `gameplay.spec.ts` — canvas interaction, guess validation, history sync, scoring |

---

### Feature 004 — Result, Restart & Final Validation

**Goal**: Host ends the round; all players see results inline; host can restart or exit to lobby.

| Area | What was added |
|------|---------------|
| Data model | `RoomStatus` extended to `"lobby" \| "in_game" \| "result"` |
| Backend — end round | `endRound()` service (in_game → result, host-only); `POST /rooms/:code/end` (403/409) |
| Backend — restart | `restartGame()` service (result → lobby, clears all round state, scores reset to 0); `POST /rooms/:code/restart` |
| Backend — exit | `exitRound()` service (any active status → lobby, host-only); `POST /rooms/:code/exit` |
| Backend — snapshot | `toRoomSnapshot()` updated: `word` visible to ALL viewers in result status |
| Frontend — deferred reveal | `ResultPanel`: hides ✓/✗ indicators during `in_game`; reveals on `result` |
| Frontend — deferred reveal | `Scoreboard`: shows "—" for all scores during `in_game`; reveals actual scores on `result` |
| Frontend — game layout | "Round Over!" modal removed; results revealed inline in the existing game layout; secret word shown to all via inline `<strong>` text |
| Frontend — buttons | "End Round" (host, in_game); "Play Again" (host, result); "Exit Game" (host only, any active status) |
| Frontend — routing | `LobbyPage` redirect extended to include `"result"` status → `/game` |
| Testing | `result.spec.ts` — end round, inline reveals, deferred reveal timing, Exit Game, Play Again, restart flow |

---

## Key Design Decisions and Tradeoffs

| Decision | Rationale |
|----------|-----------|
| HTTP polling (not WebSockets) | Lab constraint; 2-second interval sufficient for a synchronous turn-based game |
| In-memory storage only | Lab constraint; no database; server restart clears all rooms |
| Canvas strokes synced via HTTP polling | Per-stroke POST on mouseup; guessers re-render all strokes on each poll — ~2 s lag accepted |
| Deferred reveal of scores and ✓/✗ | Spec amendment post-implementation; frontend-only gate tied to `room.status` |
| `isHost: boolean` in snapshot (not raw `hostId`) | Server computes per-viewer; prevents leaking internal IDs to guessers |
| Exit Game host-only | Guessers cannot reset the game room; only the host controls session lifecycle |
| Constitution-enforced quality gates | ESLint, TDD (unit + integration + E2E), WCAG 2.1 AA (`aria-describedby`, axe-core), no new runtime deps without justification |

---

## Test Coverage Summary

| Suite | Tests |
|-------|-------|
| Backend unit (roomStore, schemas) | 80 tests |
| Frontend unit (validation) | 13 tests |
| Playwright E2E | 53 tests |
| **Total** | **146 tests** |

All tests pass with zero failures as of the final commit.

---

## Spec Kit Usage

Every feature was built using the full Spec Kit workflow:
`/speckit-specify` → `/speckit-clarify` → `/speckit-plan` → `/speckit-tasks` → `/speckit-analyze` → (fix) → `/speckit-implement` → `/speckit-git-commit`

Notable patterns observed:
- `/speckit-clarify` was used both for structured Q&A (up to 3 questions per session) and for direct scope amendments when the user provided corrections after implementation
- `/speckit-analyze` consistently caught 2–6 issues per feature before implementation, preventing rework
- `/speckit-git-commit` after each command provided granular, traceable git history aligned to spec artifacts
