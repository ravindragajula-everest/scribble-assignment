import { describe, it, expect } from "vitest";
import { createRoom, joinRoom, startGame, toRoomSnapshot } from "../../src/services/roomStore.js";

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
