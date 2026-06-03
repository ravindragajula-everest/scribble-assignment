export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "in_game";

export interface Stroke {
  id: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  lineWidth: number;
}

export interface Guess {
  id: string;
  participantId: string;
  participantName: string;
  text: string;
  isCorrect: boolean;
  timestamp: string;
}

export interface Participant {
  id: string;
  name: string;
  score: number;
  joinedAt: string;
}

export interface Room {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  hostId: string;
  word?: string;
  drawerParticipantId?: string;
  guesses: Guess[];
  strokes: Stroke[];
  createdAt: string;
  updatedAt: string;
}

export interface RoomSnapshot {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  availableWords: string[];
  roles: ParticipantRole[];
  isHost: boolean;
  word?: string;
  drawerParticipantId?: string;
  guesses: Guess[];
  strokes: Stroke[];
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
