export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby";

export interface Participant {
  id: string;
  name: string;
  joinedAt: string;
}

export interface Room {
  code: string;
  status: RoomStatus;
  participants: Participant[];
  hostId: string;
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
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
