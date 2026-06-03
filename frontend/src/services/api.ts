export type ParticipantRole = "drawer" | "guesser";

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

export interface RoomSnapshot {
  code: string;
  status: "lobby" | "in_game" | "result";
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

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    },
    ...init
  });

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({ message: "Request failed" }))) as {
      message?: string;
    };

    throw new Error(errorBody.message ?? "Request failed");
  }

  return (await response.json()) as T;
}

export const api = {
  createRoom(playerName: string) {
    return request<RoomSessionResponse>("/rooms", {
      method: "POST",
      body: JSON.stringify({ playerName })
    });
  },
  joinRoom(code: string, playerName: string) {
    return request<RoomSessionResponse>(`/rooms/${encodeURIComponent(code)}/join`, {
      method: "POST",
      body: JSON.stringify({ playerName })
    });
  },
  fetchRoom(code: string, participantId?: string) {
    const query = participantId ? `?participantId=${encodeURIComponent(participantId)}` : "";
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}${query}`);
  },
  startGame(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/start`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  },
  submitGuess(code: string, participantId: string, text: string) {
    return request<{ guess: Guess; room: RoomSnapshot }>(
      `/rooms/${encodeURIComponent(code)}/guesses`,
      { method: "POST", body: JSON.stringify({ participantId, text }) }
    );
  },
  addStroke(
    code: string,
    participantId: string,
    points: Array<{ x: number; y: number }>,
    color = "#1e1e1e",
    lineWidth = 3
  ) {
    return request<{ room: RoomSnapshot }>(
      `/rooms/${encodeURIComponent(code)}/strokes`,
      { method: "POST", body: JSON.stringify({ participantId, points, color, lineWidth }) }
    );
  },
  clearStrokes(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(
      `/rooms/${encodeURIComponent(code)}/strokes`,
      { method: "DELETE", body: JSON.stringify({ participantId }) }
    );
  },
  exitRound(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/exit`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  },
  endRound(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/end`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  },
  restartGame(code: string, participantId: string) {
    return request<{ room: RoomSnapshot }>(`/rooms/${encodeURIComponent(code)}/restart`, {
      method: "POST",
      body: JSON.stringify({ participantId })
    });
  }
};
