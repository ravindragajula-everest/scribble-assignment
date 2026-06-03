import { z } from "zod";

export const createRoomSchema = z.object({
  playerName: z.string().trim().min(1, "Player name is required")
});

export const joinRoomSchema = z.object({
  playerName: z.string().trim().min(1, "Player name is required")
});

export const roomCodeParamsSchema = z.object({
  code: z.string().trim().min(1, "Room code is required")
});

export const roomViewerQuerySchema = z.object({
  participantId: z.string().optional()
});

export const startGameSchema = z.object({
  participantId: z.string().trim().min(1, "Participant ID is required")
});

export const submitGuessSchema = z.object({
  participantId: z.string().trim().min(1, "Participant ID is required"),
  text: z.string().trim().min(1, "Guess cannot be empty")
});

export const addStrokeSchema = z.object({
  participantId: z.string().trim().min(1, "Participant ID is required"),
  points: z.array(z.object({ x: z.number(), y: z.number() })).min(1, "Stroke must have at least one point"),
  color: z.string().default("#1e1e1e"),
  lineWidth: z.number().positive().default(3)
});

export const clearStrokesSchema = z.object({
  participantId: z.string().trim().min(1, "Participant ID is required")
});

export class HttpError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}
