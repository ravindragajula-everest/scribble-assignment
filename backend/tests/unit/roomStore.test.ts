import { describe, it, expect, beforeEach } from "vitest";
import { createRoom, joinRoom, toRoomSnapshot } from "../../src/services/roomStore.js";

// Clear in-memory state between tests by creating fresh rooms each time.

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

describe("toRoomSnapshot", () => {
  it("returns isHost: true when viewerParticipantId matches hostId", () => {
    const { room, participantId } = createRoom("Alice");
    const snapshot = toRoomSnapshot(room, participantId);
    expect(snapshot.isHost).toBe(true);
  });

  it("returns isHost: false when viewerParticipantId does not match hostId", () => {
    const { room } = createRoom("Alice");
    const joiner = joinRoom(room.code, "Bob");
    const snapshot = toRoomSnapshot(joiner!.room, joiner!.participantId);
    expect(snapshot.isHost).toBe(false);
  });

  it("returns isHost: false when viewerParticipantId is undefined", () => {
    const { room } = createRoom("Alice");
    const snapshot = toRoomSnapshot(room, undefined);
    expect(snapshot.isHost).toBe(false);
  });
});
