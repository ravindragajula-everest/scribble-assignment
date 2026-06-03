export type ParticipantRole = "drawer" | "guesser";
export type RoomStatus = "lobby" | "in_game";

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
  word?: string;
  drawerParticipantId?: string;
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
}

export interface RoomSessionResponse {
  participantId: string;
  room: RoomSnapshot;
}
