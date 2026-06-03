import { Router } from "express";
import {
  addStrokeSchema,
  clearStrokesSchema,
  createRoomSchema,
  endRoundSchema,
  exitRoundSchema,
  HttpError,
  joinRoomSchema,
  restartGameSchema,
  roomCodeParamsSchema,
  roomViewerQuerySchema,
  startGameSchema,
  submitGuessSchema
} from "./schemas.js";
import { addStroke, clearStrokes, createRoom, endRound, exitRound, getRoom, joinRoom, restartGame, startGame, submitGuess, toRoomSnapshot } from "../services/roomStore.js";

export function createRoomsRouter() {
  const router = Router();

  router.post("/", (request, response, next) => {
    try {
      const { playerName } = createRoomSchema.parse(request.body);
      const result = createRoom(playerName);

      response.status(201).json({
        participantId: result.participantId,
        room: toRoomSnapshot(result.room, result.participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/join", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { playerName } = joinRoomSchema.parse(request.body);
      const result = joinRoom(code.toUpperCase(), playerName);

      if (!result) {
        throw new HttpError(404, "Unable to join room");
      }

      response.json({
        participantId: result.participantId,
        room: toRoomSnapshot(result.room, result.participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/start", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = startGameSchema.parse(request.body);
      const result = startGame(code.toUpperCase(), participantId);

      if ("error" in result) {
        if (result.error === "not_found") throw new HttpError(404, "Room not found");
        if (result.error === "already_started") throw new HttpError(409, "Game already started");
        throw new HttpError(403, "Only the host can start the game");
      }

      response.json({ room: toRoomSnapshot(result.room, participantId) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/guesses", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId, text } = submitGuessSchema.parse(request.body);
      const result = submitGuess(code.toUpperCase(), participantId, text);

      if ("error" in result) {
        if (result.error === "not_found") throw new HttpError(404, "Room not found");
        if (result.error === "not_in_game") throw new HttpError(409, "Game is not in progress");
        if (result.error === "drawer_cannot_guess") throw new HttpError(403, "Drawer cannot submit guesses");
        if (result.error === "empty_guess") throw new HttpError(400, "Guess cannot be empty");
        throw new HttpError(404, "Participant not found");
      }

      response.status(201).json({
        guess: result.guess,
        room: toRoomSnapshot(result.room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/strokes", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId, points, color, lineWidth } = addStrokeSchema.parse(request.body);
      const result = addStroke(code.toUpperCase(), participantId, { points, color, lineWidth });

      if ("error" in result) {
        if (result.error === "not_found") throw new HttpError(404, "Room not found");
        if (result.error === "not_in_game") throw new HttpError(409, "Game is not in progress");
        throw new HttpError(403, "Only the drawer can add strokes");
      }

      response.status(201).json({ room: toRoomSnapshot(result.room, participantId) });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/:code/strokes", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = clearStrokesSchema.parse(request.body);
      const result = clearStrokes(code.toUpperCase(), participantId);

      if ("error" in result) {
        if (result.error === "not_found") throw new HttpError(404, "Room not found");
        if (result.error === "not_in_game") throw new HttpError(409, "Game is not in progress");
        throw new HttpError(403, "Only the drawer can clear the canvas");
      }

      response.json({ room: toRoomSnapshot(result.room, participantId) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/exit", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = exitRoundSchema.parse(request.body);
      const result = exitRound(code.toUpperCase(), participantId);

      if ("error" in result) {
        if (result.error === "not_found") throw new HttpError(404, "Room not found");
        if (result.error === "already_lobby") throw new HttpError(409, "Room is already in lobby");
        throw new HttpError(403, "Only the host can exit the game");
      }

      response.json({ room: toRoomSnapshot(result.room, participantId) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/end", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = endRoundSchema.parse(request.body);
      const result = endRound(code.toUpperCase(), participantId);

      if ("error" in result) {
        if (result.error === "not_found") throw new HttpError(404, "Room not found");
        if (result.error === "not_in_game") throw new HttpError(409, "Game is not in progress");
        throw new HttpError(403, "Only the host can end the round");
      }

      response.json({ room: toRoomSnapshot(result.room, participantId) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/:code/restart", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = restartGameSchema.parse(request.body);
      const result = restartGame(code.toUpperCase(), participantId);

      if ("error" in result) {
        if (result.error === "not_found") throw new HttpError(404, "Room not found");
        if (result.error === "not_in_result") throw new HttpError(409, "Round has not ended yet");
        throw new HttpError(403, "Only the host can restart the game");
      }

      response.json({ room: toRoomSnapshot(result.room, participantId) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/:code", (request, response, next) => {
    try {
      const { code } = roomCodeParamsSchema.parse(request.params);
      const { participantId } = roomViewerQuerySchema.parse(request.query);
      const room = getRoom(code.toUpperCase());

      if (!room) {
        throw new HttpError(404, "Unable to load room");
      }

      response.json({
        room: toRoomSnapshot(room, participantId)
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
