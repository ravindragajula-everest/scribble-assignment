import { describe, it, expect } from "vitest";
import { addStroke, clearStrokes, createRoom, joinRoom, startGame, submitGuess, toRoomSnapshot } from "../../src/services/roomStore.js";

describe("createRoom", () => {
  it("assigns hostId equal to the first participant's id", () => {
    const { room, participantId } = createRoom("Alice");
    expect(room.hostId).toBe(participantId);
  });

  it("sets hostId on every new room independently", () => {
    const a = createRoom("Alice");
    const b = createRoom("Bob");
    expect(a.room.hostId).toBe(a.participantId);
    expect(b.room.hostId).toBe(b.participantId);
    expect(a.room.hostId).not.toBe(b.room.hostId);
  });
});

describe("toRoomSnapshot — lobby state", () => {
  it("returns isHost: true when viewerParticipantId matches hostId", () => {
    const { room, participantId } = createRoom("Alice");
    expect(toRoomSnapshot(room, participantId).isHost).toBe(true);
  });

  it("returns isHost: false for joiner", () => {
    const { room } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob")!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    expect(toRoomSnapshot(joiner.room, joiner.participantId).isHost).toBe(false);
  });

  it("returns isHost: false when viewerParticipantId is undefined", () => {
    const { room } = createRoom("Alice");
    expect(toRoomSnapshot(room).isHost).toBe(false);
  });

  it("does not include word or drawerParticipantId in lobby state", () => {
    const { room, participantId } = createRoom("Alice");
    const snapshot = toRoomSnapshot(room, participantId);
    expect(snapshot.word).toBeUndefined();
    expect(snapshot.drawerParticipantId).toBeUndefined();
  });
});

describe("startGame", () => {
  it("sets status to in_game, word to 'rocket', drawerParticipantId to hostId", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");
    const result = startGame(room.code, participantId);
    expect(result).toMatchObject({ room: { status: "in_game", word: "rocket", drawerParticipantId: participantId } });
  });

  it("returns not_host error when caller is not the host", () => {
    const { room } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob")!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    expect(startGame(room.code, joiner.participantId)).toEqual({ error: "not_host" });
  });

  it("returns already_started error when room is already in_game", () => {
    const { room, participantId } = createRoom("Alice");
    joinRoom(room.code, "Bob");
    startGame(room.code, participantId);
    expect(startGame(room.code, participantId)).toEqual({ error: "already_started" });
  });
});

describe("toRoomSnapshot — in_game state", () => {
  it("returns word for drawer and drawerParticipantId for all", () => {
    const { room, participantId: hostId } = createRoom("Alice");
    joinRoom(room.code, "Bob");
    const started = startGame(room.code, hostId);
    if (!("room" in started)) throw new Error("startGame failed");

    const snap = toRoomSnapshot(started.room, hostId);
    expect(snap.word).toBe("rocket");
    expect(snap.drawerParticipantId).toBe(hostId);
    expect(snap.isHost).toBe(true);
  });

  it("omits word for guesser but includes drawerParticipantId", () => {
    const { room, participantId: hostId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob")!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    const started = startGame(room.code, hostId);
    if (!("room" in started)) throw new Error("startGame failed");

    const snap = toRoomSnapshot(started.room, joiner.participantId);
    expect(snap.word).toBeUndefined();
    expect(snap.drawerParticipantId).toBe(hostId);
    expect(snap.isHost).toBe(false);
  });
});

describe("submitGuess", () => {
  it("records correct guess and awards 100 points", () => {
    const { room, participantId: hostId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob")!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    startGame(room.code, hostId);
    const result = submitGuess(room.code, joiner.participantId, "rocket");
    expect(result).toMatchObject({ guess: { isCorrect: true, text: "rocket" } });
    if (!("guess" in result)) throw new Error("submitGuess failed");
    const participant = result.room.participants.find((p) => p.id === joiner.participantId);
    expect(participant?.score).toBe(100);
  });

  it("records incorrect guess with score unchanged", () => {
    const { room, participantId: hostId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob")!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    startGame(room.code, hostId);
    const result = submitGuess(room.code, joiner.participantId, "pizza");
    expect(result).toMatchObject({ guess: { isCorrect: false, text: "pizza" } });
    if (!("guess" in result)) throw new Error("submitGuess failed");
    const participant = result.room.participants.find((p) => p.id === joiner.participantId);
    expect(participant?.score).toBe(0);
  });

  it("trims whitespace and matches case-insensitively", () => {
    const { room, participantId: hostId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob")!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    startGame(room.code, hostId);
    const result = submitGuess(room.code, joiner.participantId, "  ROCKET  ");
    expect(result).toMatchObject({ guess: { isCorrect: true, text: "ROCKET" } });
  });

  it("returns drawer_cannot_guess when drawer submits", () => {
    const { room, participantId: hostId } = createRoom("Alice");
    joinRoom(room.code, "Bob");
    startGame(room.code, hostId);
    expect(submitGuess(room.code, hostId, "rocket")).toEqual({ error: "drawer_cannot_guess" });
  });

  it("toRoomSnapshot includes guesses array", () => {
    const { room, participantId: hostId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob")!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    startGame(room.code, hostId);
    const result = submitGuess(room.code, joiner.participantId, "pizza");
    if (!("room" in result)) throw new Error("submitGuess failed");
    const snap = toRoomSnapshot(result.room, joiner.participantId);
    expect(Array.isArray(snap.guesses)).toBe(true);
    expect(snap.guesses.length).toBe(1);
    expect(snap.guesses[0].text).toBe("pizza");
  });
});

describe("addStroke", () => {
  it("appends a stroke to room.strokes for drawer", () => {
    const { room, participantId: hostId } = createRoom("Alice");
    joinRoom(room.code, "Bob");
    startGame(room.code, hostId);
    const result = addStroke(room.code, hostId, { points: [{ x: 10, y: 20 }, { x: 30, y: 40 }], color: "#1e1e1e", lineWidth: 3 });
    expect(result).toMatchObject({ room: { strokes: [{ points: [{ x: 10, y: 20 }, { x: 30, y: 40 }] }] } });
  });

  it("returns not_drawer error for non-drawer", () => {
    const { room, participantId: hostId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob")!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    startGame(room.code, hostId);
    expect(addStroke(room.code, joiner.participantId, { points: [{ x: 0, y: 0 }], color: "#000", lineWidth: 2 })).toEqual({ error: "not_drawer" });
  });

  it("toRoomSnapshot includes strokes array", () => {
    const { room, participantId: hostId } = createRoom("Alice");
    joinRoom(room.code, "Bob");
    startGame(room.code, hostId);
    const result = addStroke(room.code, hostId, { points: [{ x: 5, y: 5 }], color: "#1e1e1e", lineWidth: 3 });
    if (!("room" in result)) throw new Error("addStroke failed");
    const snap = toRoomSnapshot(result.room, hostId);
    expect(Array.isArray(snap.strokes)).toBe(true);
    expect(snap.strokes.length).toBe(1);
  });
});

describe("clearStrokes", () => {
  it("resets strokes to empty array for drawer", () => {
    const { room, participantId: hostId } = createRoom("Alice");
    joinRoom(room.code, "Bob");
    startGame(room.code, hostId);
    addStroke(room.code, hostId, { points: [{ x: 0, y: 0 }], color: "#000", lineWidth: 2 });
    const result = clearStrokes(room.code, hostId);
    expect(result).toMatchObject({ room: { strokes: [] } });
  });

  it("returns not_drawer error for non-drawer", () => {
    const { room, participantId: hostId } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob")!; // eslint-disable-line @typescript-eslint/no-non-null-assertion
    startGame(room.code, hostId);
    expect(clearStrokes(room.code, joiner.participantId)).toEqual({ error: "not_drawer" });
  });
});
