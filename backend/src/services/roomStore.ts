import { randomUUID } from "node:crypto";
import type { Guess, Participant, Room, RoomSnapshot, Stroke } from "../models/game.js";
import { STARTER_ROLES, STARTER_WORDS } from "../seed/starterData.js";

const rooms = new Map<string, Room>();

function now() {
  return new Date().toISOString();
}

function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < 4; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function generateUniqueCode() {
  let code = generateCode();

  while (rooms.has(code)) {
    code = generateCode();
  }

  return code;
}

function displayName(name?: string) {
  return name || "Player";
}

function createParticipant(name?: string): Participant {
  return {
    id: randomUUID(),
    name: displayName(name),
    score: 0,
    joinedAt: now()
  };
}

function cloneRoom(room: Room) {
  return structuredClone(room);
}

export function listWords() {
  return [...STARTER_WORDS];
}

export function createRoom(playerName?: string) {
  const participant = createParticipant(playerName);
  const room: Room = {
    code: generateUniqueCode(),
    status: "lobby",
    participants: [participant],
    hostId: participant.id,
    guesses: [],
    strokes: [],
    createdAt: now(),
    updatedAt: now()
  };

  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function joinRoom(code: string, playerName?: string) {
  const room = rooms.get(code);

  if (!room) {
    return null;
  }

  const participant = createParticipant(playerName);
  room.participants.push(participant);
  room.updatedAt = now();
  rooms.set(room.code, room);

  return {
    room: cloneRoom(room),
    participantId: participant.id
  };
}

export function getRoom(code: string) {
  const room = rooms.get(code);
  return room ? cloneRoom(room) : null;
}

export function saveRoom(room: Room) {
  room.updatedAt = now();
  rooms.set(room.code, cloneRoom(room));
  return getRoom(room.code);
}

export function startGame(code: string, participantId: string) {
  const room = rooms.get(code);
  if (!room) return { error: "not_found" } as const;
  if (room.status !== "lobby") return { error: "already_started" } as const;
  if (participantId !== room.hostId) return { error: "not_host" } as const;

  room.status = "in_game";
  room.word = STARTER_WORDS[0];
  room.drawerParticipantId = room.hostId;
  room.updatedAt = now();
  rooms.set(code, room);
  return { room: cloneRoom(room) };
}

export function submitGuess(code: string, participantId: string, text: string) {
  const room = rooms.get(code);
  if (!room) return { error: "not_found" } as const;
  if (room.status !== "in_game") return { error: "not_in_game" } as const;
  if (participantId === room.drawerParticipantId) return { error: "drawer_cannot_guess" } as const;

  const trimmed = text.trim();
  if (trimmed.length === 0) return { error: "empty_guess" } as const;

  const participant = room.participants.find((p) => p.id === participantId);
  if (!participant) return { error: "participant_not_found" } as const;

  const correct = trimmed.toLowerCase() === (room.word ?? "").toLowerCase();
  const guess: Guess = {
    id: randomUUID(),
    participantId,
    participantName: participant.name,
    text: trimmed,
    isCorrect: correct,
    timestamp: now()
  };

  room.guesses.push(guess);
  if (correct) participant.score += 100;
  room.updatedAt = now();
  rooms.set(code, room);
  return { guess, room: cloneRoom(room) };
}

export function addStroke(
  code: string,
  participantId: string,
  stroke: Omit<Stroke, "id">
) {
  const room = rooms.get(code);
  if (!room) return { error: "not_found" } as const;
  if (room.status !== "in_game") return { error: "not_in_game" } as const;
  if (participantId !== room.drawerParticipantId) return { error: "not_drawer" } as const;

  const newStroke: Stroke = { id: randomUUID(), ...stroke };
  room.strokes.push(newStroke);
  room.updatedAt = now();
  rooms.set(code, room);
  return { room: cloneRoom(room) };
}

export function clearStrokes(code: string, participantId: string) {
  const room = rooms.get(code);
  if (!room) return { error: "not_found" } as const;
  if (room.status !== "in_game") return { error: "not_in_game" } as const;
  if (participantId !== room.drawerParticipantId) return { error: "not_drawer" } as const;

  room.strokes = [];
  room.updatedAt = now();
  rooms.set(code, room);
  return { room: cloneRoom(room) };
}

export function toRoomSnapshot(room: Room, viewerParticipantId?: string): RoomSnapshot {
  const isDrawer =
    room.status === "in_game" &&
    viewerParticipantId !== undefined &&
    viewerParticipantId === room.drawerParticipantId;

  return {
    code: room.code,
    status: room.status,
    participants: room.participants.map((p) => ({ ...p })),
    availableWords: listWords(),
    roles: [...STARTER_ROLES],
    isHost: viewerParticipantId === room.hostId,
    ...(room.status === "in_game" && { drawerParticipantId: room.drawerParticipantId }),
    ...(isDrawer && { word: room.word }),
    guesses: room.guesses.map((g) => ({ ...g })),
    strokes: room.strokes.map((s) => ({ ...s, points: s.points.map((p) => ({ ...p })) }))
  };
}
