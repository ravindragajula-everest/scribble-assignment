# Feature Specification: Room Setup & Lobby

**Feature Branch**: `001-room-setup-lobby`
**Created**: 2026-06-02
**Status**: Draft

## What Already Exists (do not re-implement)

The starter codebase already provides the following — these MUST NOT be reimplemented:

- `POST /api/rooms` — creates a room and returns the first participant's ID and a room snapshot
- `POST /api/rooms/:code/join` — joins an existing room by code and returns the joiner's participant ID and snapshot
- `GET /api/rooms/:code` — fetches the current room snapshot for a given participant
- `CreateRoomPage` — form that sends player name to the API and navigates to `/lobby`
- `JoinRoomPage` — form that sends player name + room code to the API and navigates to `/lobby`
- `LobbyPage` — displays the participant list and a manual "Refresh Room" button
- `RoomStore` — client-side store with `createRoom()`, `joinRoom()`, and `fetchRoom()` actions

## User Scenarios & Testing

### User Story 1 — Host Identification on Room Creation (Priority: P1)

A player creates a room and is automatically recognised as the host for that room. No action is required from the player to claim host status — it is assigned at the moment of creation.

**Why this priority**: Host identity is the foundation for all host-only controls (Start Game). Nothing in Story 2 or 3 works without it.

**Independent Test**: Create a room. Confirm the returned snapshot has `isHost: true` for the creator. Fetch the same room as the second player and confirm their snapshot has `isHost: false`.

**Acceptance Scenarios**:

1. **Given** a player submits a valid name on the Create Room screen, **When** the room is created, **Then** the returned snapshot includes `isHost: true` for that player.
2. **Given** a second player joins the room, **When** the lobby snapshot is fetched by the second player, **Then** their snapshot includes `isHost: false`; when fetched by the creator, `isHost` remains `true`.

---

### User Story 2 — Input Validation on Create and Join (Priority: P1)

Player name and room code fields are validated before any network request is made. Empty or whitespace-only values are rejected immediately with a visible, descriptive error message. The form is not submitted until all required inputs are valid.

**Why this priority**: Without this, the backend receives blank names (stored as "Player") and blank codes (returning confusing 404s), breaking both flows silently.

**Independent Test**: On Create Room, submit with an empty name — verify error appears and no API call is made. On Join Room, submit with an empty name and/or empty code — verify per-field errors appear and no API call is made.

**Acceptance Scenarios**:

1. **Given** the Create Room form is open, **When** a player submits with an empty or whitespace-only player name, **Then** the form shows an inline error "Player name is required" and does not call the API.
2. **Given** the Join Room form is open, **When** a player submits with an empty or whitespace-only player name, **Then** the form shows "Player name is required" inline and does not call the API.
3. **Given** the Join Room form is open, **When** a player submits with an empty or whitespace-only room code, **Then** the form shows "Room code is required" inline and does not call the API.
4. **Given** valid input on either form, **When** the player submits, **Then** the API is called exactly once with the trimmed values.
5. **Given** the backend receives a player name that is only whitespace, **When** the room is created or joined, **Then** the backend returns a 400 response with message "Player name is required".
6. **Given** the backend receives a room code that is only whitespace, **When** joining, **Then** the backend returns a 400 response with message "Room code is required".

---

### User Story 3 — Host-Only Start Game Button (Priority: P2)

The "Start Game" button is visible only to the host and is enabled only when at least two players are present in the lobby. For all other participants, the button is not rendered. Within this feature's scope, clicking the enabled button takes no action — the game-start flow is implemented in a later feature.

**Why this priority**: This enforces the business rule that only the host controls game start and prevents premature navigation.

**Independent Test**: Open the lobby as the host with one player present — verify button is visible but disabled. A second player joins — verify button becomes enabled. Open the lobby as the second (non-host) player — verify the button is absent entirely.

**Acceptance Scenarios**:

1. **Given** the current user is the host and only one player is in the lobby, **When** the lobby loads or refreshes, **Then** the "Start Game" button is visible but disabled.
2. **Given** the current user is the host and at least two players are in the lobby, **When** the lobby loads or refreshes, **Then** the "Start Game" button is visible and enabled (clickable, but performs no navigation or action in this feature scope).
3. **Given** the current user is NOT the host, **When** the lobby loads or refreshes, **Then** no "Start Game" button is rendered for that user.
4. **Given** the host's "Start Game" button is enabled, **When** the host clicks it, **Then** nothing happens (no navigation, no API call) — this is intentional for this scope.

---

### User Story 4 — Automatic Lobby Polling (Priority: P2)

The lobby screen automatically refreshes the participant list every 2 seconds without any user action. When a new player joins from another browser tab or device, the host and existing players see the updated list within approximately 2 seconds. The polling stops when the user navigates away from the lobby.

**Why this priority**: Manual refresh forces players to click repeatedly. Automatic polling makes multi-player joining seamless.

**Independent Test**: Open the lobby in browser tab A. In browser tab B, join the same room. Without clicking anything in tab A, verify the new participant appears in tab A's participant list within 2 seconds.

**Acceptance Scenarios**:

1. **Given** a player is on the Lobby screen, **When** 2 seconds elapse, **Then** the participant list is automatically refreshed from the server.
2. **Given** a second player joins the room from a different tab, **When** the next poll fires in the first tab, **Then** the new participant's name appears in the list without any manual action.
3. **Given** a player navigates away from the Lobby screen (e.g., back to home), **When** they leave, **Then** the polling interval is cleared and no further requests are made.
4. **Given** a poll request fails (e.g., network error), **When** the error occurs, **Then** the existing participant list remains visible, no error message is shown to the user, and the next scheduled poll still fires at the 2-second interval.

---

### Edge Cases

- Any number of players may join a room — there is no upper limit on participants.
- If a player refreshes their browser and loses their `participantId`, they re-join as a new participant (not in scope to fix — treated as a known limitation).
- Joining with a room code that does not exist returns a "Room not found" error visible to the user.
- Joining with a correctly formatted code that maps to no active room returns a "Room not found" error.
- Rooms with only one participant (the host) show the Start Game button as disabled.

## Requirements

### Functional Requirements

- **FR-001**: When a room is created, the system MUST assign the creator as the host by storing their participant ID as `hostId` on the room.
- **FR-002**: The room snapshot returned by all three room endpoints MUST include `isHost: boolean`, computed server-side as `true` when the requesting participant's ID equals the room's stored `hostId`, and `false` otherwise. The raw `hostId` is stored on the Room model but is NOT exposed in the snapshot.
- **FR-003**: The Create Room form MUST reject submission if player name is empty or whitespace-only, displaying "Player name is required" inline immediately after the submit button is clicked. Errors MUST NOT appear before submission.
- **FR-004**: The Join Room form MUST reject submission if player name is empty or whitespace-only, displaying "Player name is required" inline immediately after the submit button is clicked. Errors MUST NOT appear before submission.
- **FR-005**: The Join Room form MUST reject submission if room code is empty or whitespace-only, displaying "Room code is required" inline immediately after the submit button is clicked. Errors MUST NOT appear before submission.
- **FR-006**: Before storing, both the backend MUST trim whitespace from player names and room codes; a value that becomes empty after trimming MUST be rejected with HTTP 400.
- **FR-007**: The Lobby screen MUST poll `GET /api/rooms/:code` every 2 seconds and update the participant list with each response.
- **FR-008**: Polling MUST stop when the user navigates away from the Lobby screen.
- **FR-008a**: When a poll request fails, the Lobby MUST silently discard the error, keep the existing participant list visible, and continue polling on the regular 2-second interval. No error message or indicator MUST be shown to the user for poll failures.
- **FR-009**: The "Start Game" button MUST be rendered only when the snapshot's `isHost` field is `true` for the current user.
- **FR-010**: The "Start Game" button MUST be disabled when the participant count is fewer than 2; it MUST be enabled when the participant count is 2 or more.
- **FR-011**: Clicking the enabled "Start Game" button MUST take no action (no navigation, no API call) within this feature's scope.

### Key Entities

- **Room**: A game session identified by a unique 4-character code. Gains a new `hostId` field (the participant ID of the creator, stored internally). Existing fields: `code`, `status`, `participants`, `createdAt`, `updatedAt`.
- **RoomSnapshot**: The read-only view of a Room returned by the API. Gains a new `isHost: boolean` field, computed server-side per viewer — `true` when the requesting participant is the host, `false` otherwise. The raw `hostId` is NOT included in the snapshot.
- **Participant**: An individual player in a room. Fields: `id`, `name`, `joinedAt`. Unchanged.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A player joining a room as the second participant appears in the host's lobby participant list within one poll cycle (~2 s), without the host clicking any button.
- **SC-002**: 100% of attempts to create or join a room with a blank or whitespace-only name are rejected before an API call is made, with a visible error message.
- **SC-003**: 100% of attempts to join a room with a blank or whitespace-only code are rejected before an API call is made, with a visible error message.
- **SC-004**: The "Start Game" button is absent from the lobby view of every non-host participant in all tested scenarios.
- **SC-005**: The "Start Game" button transitions from disabled to enabled in the host's lobby within one polling cycle after the second player joins.

## Assumptions

- `participantId` is stored in client-side memory (the existing `RoomStore`) and is not persisted across page refreshes. A hard refresh means the player is treated as a new joiner — this is a known limitation and is not in scope to fix here.
- The polling interval of 2 seconds is a fixed value for this feature; making it configurable is out of scope.
- There is no upper limit on the number of players in a room — the lobby MUST display all participants regardless of count.
- The "Start Game" button click producing no action is intentional and will be replaced in the next feature group (Game Start & Drawer Flow).
- Room isolation (rooms being fully independent from each other) is already guaranteed by the existing in-memory store's Map keyed by room code; no additional isolation work is required.
- Player name trimming produces the canonical stored value — a name entered as "  Alice  " is stored and displayed as "Alice".
- "Player" is the user-facing label for what the data model calls a "participant" — the two terms refer to the same entity. User stories use "player" for readability; functional requirements and data-model definitions use "participant" for technical precision.

## Clarifications

### Session 2026-06-02

- Q: Should the room snapshot expose the raw `hostId` string or a computed `isHost: boolean` for the viewer? → A: `isHost: boolean` — server computes it from `viewerParticipantId === room.hostId`; raw `hostId` is stored on the Room model but not exposed in the snapshot.
- Q: Should validation errors appear on submit only, on blur, or in real-time as the user types? → A: On submit only — errors appear after the user clicks the submit button.
- Q: When a background poll fails, should the UI show a visible error indicator or retry silently? → A: Silent retry — no error shown; existing participant list stays visible; next poll fires on schedule.

## Out of Scope

- Game start navigation and backend game-start endpoint (next feature)
- Drawer assignment, word selection, and game state transitions
- WebSockets or any real-time push protocol
- Persistent storage or database
- Authentication or session management
- Maximum player limits
- Spectator mode, kick, or moderation
