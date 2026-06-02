# Discovery Notes — Scribble Assignment

Codebase review of the multiplayer drawing game (Express backend + React/Vite frontend).

---

## Incomplete Behaviors

### 1. Guess Submission Is a No-Op

The `GuessForm` component prevents form default but does nothing else — no API call, no state update, no validation.

```ts
// frontend/src/components/GuessForm.tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  // nothing here
};
```

There is no corresponding backend endpoint (e.g. `POST /api/rooms/:code/guesses`), no `Guess` type in the data model, and no guesses array on the `Room` object. The `ResultPanel` and `Scoreboard` components are purely presentational with hardcoded placeholder text — they are never fed real data.

**Relevant files:**
- [frontend/src/components/GuessForm.tsx](../frontend/src/components/GuessForm.tsx)
- [frontend/src/components/ResultPanel.tsx](../frontend/src/components/ResultPanel.tsx)
- [frontend/src/components/Scoreboard.tsx](../frontend/src/components/Scoreboard.tsx)
- [backend/src/models/game.ts](../backend/src/models/game.ts)
- [backend/src/api/router.ts](../backend/src/api/router.ts)

---

### 2. Game Start and Host Enforcement Are Missing

The "Start Game" button in `LobbyPage` unconditionally calls `navigate("/game")` — it does not verify the user is the host, does not check that at least 2 players are present, and makes no backend call to transition room state. There is no `hostId` field on the `Room` model and no backend endpoint to start a game.

```tsx
// frontend/src/pages/LobbyPage.tsx
<button onClick={() => navigate("/game")}>Start Game</button>
```

`RoomStatus` is a single-value literal type (`"lobby"`), so there is no modeled path to an in-game or results state anywhere in the system.

**Relevant files:**
- [frontend/src/pages/LobbyPage.tsx](../frontend/src/pages/LobbyPage.tsx)
- [backend/src/models/game.ts](../backend/src/models/game.ts) — `RoomStatus`, `Room` interface
- [backend/src/services/roomStore.ts](../backend/src/services/roomStore.ts) — `createRoom()`
- [backend/src/api/router.ts](../backend/src/api/router.ts)

---

### 3. Drawer Role Assignment Is Stubbed

`toRoomSnapshot()` always returns a static `[...STARTER_ROLES]` array regardless of how many players are in the room or what game phase it is in. The `viewerParticipantId` parameter exists to enable role-based visibility (e.g. hide the secret word from guessers) but is explicitly voided:

```ts
// backend/src/services/roomStore.ts
function toRoomSnapshot(room: Room, viewerParticipantId: string): RoomSnapshot {
  void viewerParticipantId; // intentionally unused — feature not yet implemented
  ...
  roles: [...STARTER_ROLES],
}
```

There is no logic to designate which participant is the active drawer, no word assignment, and `GamePage` hardcodes `"Round 1"` with no connection to real game state.

**Relevant files:**
- [backend/src/services/roomStore.ts](../backend/src/services/roomStore.ts) — `toRoomSnapshot()`
- [backend/src/models/game.ts](../backend/src/models/game.ts) — `RoomStatus`, role types
- [frontend/src/pages/GamePage.tsx](../frontend/src/pages/GamePage.tsx)
- [frontend/src/state/roomStore.ts](../frontend/src/state/roomStore.ts)

---

### 4. Canvas Is a Static Placeholder

`GamePage` renders a `<div className="canvas-placeholder">` with hardcoded text. There is no `<canvas>` element, no drawing event handlers, no drawing data model on the backend, and no API surface to send or receive strokes. The entire real-time drawing feature — the core mechanic of the game — is absent.

**Relevant files:**
- [frontend/src/pages/GamePage.tsx](../frontend/src/pages/GamePage.tsx) — `canvas-placeholder` div
- [backend/src/models/game.ts](../backend/src/models/game.ts) — no drawing state
- [backend/src/api/router.ts](../backend/src/api/router.ts) — no drawing endpoints

---

### 5. No Automatic Polling Despite Spec Requirement

`LobbyPage` exposes a manual "Refresh Room" button but never sets up a `setInterval` or equivalent. The `AGENTS.md` spec calls for HTTP polling at ~2 s cadence to keep all participants in sync. Without it, a second player joining the room is invisible to the first player until they click refresh.

**Relevant files:**
- [frontend/src/pages/LobbyPage.tsx](../frontend/src/pages/LobbyPage.tsx) — `fetchRoom` triggered only on button click
- [frontend/src/state/roomStore.ts](../frontend/src/state/roomStore.ts) — `fetchRoom()` action
- [AGENTS.md](../AGENTS.md) — polling requirement

---

## Assumptions

### A. Player Names Are Assumed Non-Empty and Trimmed

The backend schema accepts `playerName` as an optional string with no format constraints. A name consisting entirely of whitespace (e.g. `"   "`) passes Zod validation and is stored as-is. `displayName()` only falls back to `"Player"` when the value is `undefined`, not when it is blank.

```ts
// backend/src/api/schemas.ts
export const createRoomSchema = z.object({
  playerName: z.string().optional(),
});

// backend/src/services/roomStore.ts
function displayName(name: string | undefined): string {
  return name ?? "Player"; // does not handle "   "
}
```

The frontend pages send whatever the user typed without trimming before the API call.

**Relevant files:**
- [backend/src/api/schemas.ts](../backend/src/api/schemas.ts)
- [backend/src/services/roomStore.ts](../backend/src/services/roomStore.ts) — `displayName()`
- [frontend/src/pages/CreateRoomPage.tsx](../frontend/src/pages/CreateRoomPage.tsx)
- [frontend/src/pages/JoinRoomPage.tsx](../frontend/src/pages/JoinRoomPage.tsx)

---

### B. The Backend Is Assumed to Always Be Reachable

`api.ts` derives the base URL from `import.meta.env.VITE_API_URL` with an empty-string fallback. No health-check is performed at startup. All fetch calls share a single `request()` wrapper that distinguishes only `response.ok` vs. not — network errors, timeouts, and CORS failures all collapse into the same generic message. There is no retry logic and no user-visible indicator of whether the backend is up.

```ts
// frontend/src/services/api.ts
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}
```

With the Vite proxy now in place (proxying `/api` to `localhost:3001`), `VITE_API_URL` should be left unset or set to an empty string — but this is not documented anywhere and the current `.env` handling makes it easy to misconfigure silently.

**Relevant files:**
- [frontend/src/services/api.ts](../frontend/src/services/api.ts)
- [frontend/src/state/roomStore.ts](../frontend/src/state/roomStore.ts) — `withLoading()` error handler
- [frontend/vite.config.ts](../frontend/vite.config.ts) — proxy configuration
