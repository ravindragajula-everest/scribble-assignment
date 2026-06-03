# Feature Specification: Game Start & Drawer Flow

**Feature Branch**: `002-game-start-drawer`
**Created**: 2026-06-02
**Status**: Draft

## What Already Exists (do not re-implement)

- `isHost: boolean` in `RoomSnapshot` — computed per viewer from `room.hostId`
- Input validation for player names and room codes (backend + frontend)
- 2-second automatic lobby polling in `LobbyPage`
- `participants` list display in lobby
- `hostId: string` stored on the `Room` model
- "Start Game" button in `LobbyPage` — visible ONLY to the host, enabled when ≥2 players
  are present, disabled otherwise (this behavior is UNCHANGED in this feature)

## User Scenarios & Testing

### User Story 1 — Host Starts the Game (Priority: P1)

The host clicks the enabled "Start Game" button. The system transitions the room to an
in-game state, assigns the host as the drawer, selects a secret word, and navigates the
host to the Game screen.

**Why this priority**: This is the core game-start action. Everything else in this feature
depends on the game being started.

**Independent Test**: Host clicks "Start Game" → host lands on the Game screen and sees the
secret word. The room status changes to in-game.

**Acceptance Scenarios**:

1. **Given** the host has at least 2 players in the lobby, **When** the host clicks
   "Start Game", **Then** the room transitions to in-game status.
2. **Given** the host clicks "Start Game", **When** the transition succeeds, **Then** the
   host is navigated to the Game screen.
3. **Given** the game has started, **When** the host views the Game screen, **Then** the
   host sees the secret word prominently displayed.
4. **Given** the game has started, **When** the host views the Game screen, **Then** the
   host is identified as the Drawer.

---

### User Story 2 — Non-Host Players Auto-Navigate to Game Screen (Priority: P1)

Non-host players are on the Lobby screen and their existing 2-second polling detects that the
room has transitioned to in-game status. They are automatically navigated to the Game screen
without any manual action.

**Why this priority**: Without this, only the host reaches the game screen. Other players are
stuck on the lobby indefinitely.

**Independent Test**: Host starts the game from Tab A. Tab B (non-host) automatically
navigates to the Game screen within one polling cycle (~2 seconds) without any manual action.

**Acceptance Scenarios**:

1. **Given** a non-host player is on the Lobby screen and the host has not yet started,
   **When** the host starts the game, **Then** the non-host player is automatically
   navigated to the Game screen within one polling cycle (~2 seconds).
2. **Given** a non-host player is navigated to the Game screen, **When** they arrive,
   **Then** they see the Game screen with their role displayed as "Guesser".

---

### User Story 3 — Drawer and Word Visibility on Game Screen (Priority: P1)

The Game screen shows each player their assigned role. The host (drawer) sees the secret word.
Non-host players (guessers) do not see the secret word — they see only their role.

**Why this priority**: Word secrecy is the central mechanic of the game. If guessers see the
word, the game is broken.

**Independent Test**: Host on Game screen sees secret word. Non-host player on Game screen
does NOT see the word, only their "Guesser" role label.

**Acceptance Scenarios**:

1. **Given** the game has started, **When** the host (drawer) views the Game screen,
   **Then** the secret word is displayed clearly on their screen.
2. **Given** the game has started, **When** a non-host player (guesser) views the Game
   screen, **Then** the secret word is NOT visible anywhere on their screen.
3. **Given** the game has started, **When** any player views the Game screen,
   **Then** the drawer's name is displayed so all players know who is drawing.

---

### Edge Cases

- If a player tries to start a game with only 1 participant, the Start Game button is disabled
  and the action is blocked at the UI level.
- If the room does not exist when start is attempted, the server returns an error.
- If the game has already started and a player tries to start again, the server returns an
  error (409 Conflict — room not in lobby status).
- A player who refreshes their browser mid-game and loses their `participantId` re-joins as
  a new participant — this is a known limitation, not in scope to fix here.
- If a player navigates directly to `/game` before the game has started: if they have a room
  in session they are redirected to `/lobby`; if they have no room in session they are
  redirected to `/` (home).
- The word is always the first entry from the starter list for determinism: "rocket".
  No random selection occurs.

## Requirements

### Functional Requirements

- **FR-001**: When the host clicks the enabled "Start Game" button, the system MUST call the
  game-start endpoint to transition the room from lobby to in-game status.
- **FR-002**: The game-start endpoint MUST assign the host participant as the drawer for
  the round.
- **FR-003**: The game-start endpoint MUST select the secret word deterministically as the
  first entry in the starter word list ("rocket"). No random selection is permitted.
- **FR-004**: The room snapshot MUST include a `word` field visible ONLY when the requesting
  participant is the drawer (host). Non-host participants MUST receive no word in their snapshot.
- **FR-005**: The room snapshot MUST include the drawer's participant ID so all players can
  identify who is drawing.
- **FR-006**: After the host starts the game successfully, the host MUST be navigated to the Game screen.
- **FR-006a**: If the game-start request fails for any reason, an inline error message MUST be displayed in the Lobby directly below the "Start Game" button. The host MUST remain on the Lobby screen. No navigation occurs on failure.
- **FR-007**: Non-host players on the Lobby screen MUST be automatically navigated to the Game
  screen within one polling cycle (~2 seconds) of the room transitioning to in-game status,
  without any manual action.
- **FR-008**: The Game screen MUST display the secret word to the drawer (host) and MUST NOT
  display it to guessers (non-host players).
- **FR-009**: The Game screen MUST display the drawer's name so all participants know who is
  drawing.
- **FR-010**: The game-start endpoint MUST reject requests if the room is not in lobby status,
  returning a 409 Conflict response.
- **FR-011**: The Game screen MUST redirect to `/lobby` if the player has a room in session
  but the room status is still "lobby" (game not yet started). It MUST redirect to `/`
  if no room is in session.

### Key Entities

- **Room**: Gains `status: "in_game"` as a new valid status value (previously only "lobby").
  Gains `word: string` (set when game starts; the selected secret word) and
  `drawerParticipantId: string` (always the host's participant ID).
- **RoomSnapshot**: Gains `word?: string` (present and populated only when viewer is the
  drawer); `drawerParticipantId: string` (always present once game starts); `status` now
  includes "in_game".
- **Participant**: Unchanged.

## Success Criteria

### Measurable Outcomes

- **SC-001**: When the host starts the game, non-host participants are automatically
  redirected to the Game screen within one polling cycle (~2 seconds) without any manual
  action.
- **SC-002**: 100% of Game screen views by non-host participants show zero secret word
  content — verified across all test scenarios.
- **SC-003**: The host's Game screen always displays the secret word "rocket" (the
  deterministic first word from the starter list) after game start.
- **SC-004**: Attempting to start a game that has already started returns an error visible to
  the host without crashing the application.

## Assumptions

- "Player" and "participant" refer to the same entity (user-facing vs technical term).
- The host is always the drawer — there is no drawer rotation in this feature scope.
- The secret word for this feature is always "rocket" (index 0 of the starter list). Word
  cycling across rounds is out of scope.
- Non-host players use the existing 2-second polling (already implemented) to detect the
  room status change — no new polling mechanism is required.
- The Game screen already exists as a placeholder; this feature populates it with drawer/word
  information. Drawing interaction and guess submission are in a future feature group.
- A participant who refreshes mid-game loses their session — this is a known limitation
  not in scope to fix here.
- The "Start Game" button remains visible to the host only and hidden from non-host players
  (unchanged from feature 001). A disabled button for non-hosts provides no value.

## Clarifications

### Session 2026-06-02

- Q: Should the "Start Game" button be visible to all lobby participants (disabled for non-hosts) or only to the host? → A: Host only — a disabled button for non-hosts provides no meaningful signal. User Story 1 (button visible to all) has been removed. Button visibility is unchanged from feature 001.
- Q: When the host's "Start Game" click fails (API error or 409), what does the host see? → A: Inline error message displayed in the Lobby directly below the Start Game button; host stays on Lobby. On success, host navigates to Game Page (FR-006).
- Q: If a player navigates directly to `/game` before the game starts, what happens? → A: Redirect to `/lobby` if they have a room in session (status still "lobby"); redirect to `/` if no room in session.

## Out of Scope

- Changing "Start Game" button visibility for non-host participants (stays host-only)
- Drawing canvas interaction and clear canvas
- Guess submission and guess history sync
- Scoring
- Result state and restart flow
- Drawer rotation across rounds
- Multiple rounds or timers
- Random word selection or custom word lists
- Authentication or session persistence across page refresh
