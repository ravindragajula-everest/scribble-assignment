import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { startTestServer, post, get, type TestServer } from "./helpers.js";

describe("POST /rooms", () => {
  let server: TestServer;

  beforeAll(async () => { server = await startTestServer(); });
  afterAll(async () => { await server.close(); });

  it("returns 201 with isHost: true for the room creator", async () => {
    const res = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    expect(res.status).toBe(201);
    const data = await res.json() as { participantId: string; room: { isHost: boolean } };
    expect(data.room.isHost).toBe(true);
    expect(typeof data.participantId).toBe("string");
  });

  it("returns 400 with 'Player name is required' for blank name", async () => {
    const res = await post(server.baseUrl, "/rooms", { playerName: "" });
    expect(res.status).toBe(400);
    const data = await res.json() as { message: string };
    expect(data.message).toBe("Player name is required");
  });

  it("returns 400 for whitespace-only name", async () => {
    const res = await post(server.baseUrl, "/rooms", { playerName: "   " });
    expect(res.status).toBe(400);
    const data = await res.json() as { message: string };
    expect(data.message).toBe("Player name is required");
  });
});

describe("POST /rooms/:code/join", () => {
  let server: TestServer;

  beforeAll(async () => { server = await startTestServer(); });
  afterAll(async () => { await server.close(); });

  it("returns isHost: false for the joiner", async () => {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { room } = await createRes.json() as { room: { code: string } };

    const joinRes = await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "Bob" });
    expect(joinRes.status).toBe(200);
    const data = await joinRes.json() as { room: { isHost: boolean } };
    expect(data.room.isHost).toBe(false);
  });

  it("returns 400 for blank player name", async () => {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { room } = await createRes.json() as { room: { code: string } };

    const res = await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "" });
    expect(res.status).toBe(400);
    const data = await res.json() as { message: string };
    expect(data.message).toBe("Player name is required");
  });

  it("returns 400 for whitespace-only player name", async () => {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { room } = await createRes.json() as { room: { code: string } };

    const res = await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "  " });
    expect(res.status).toBe(400);
    const data = await res.json() as { message: string };
    expect(data.message).toBe("Player name is required");
  });
});

describe("GET /rooms/:code", () => {
  let server: TestServer;

  beforeAll(async () => { server = await startTestServer(); });
  afterAll(async () => { await server.close(); });

  it("returns isHost: true when participantId matches creator", async () => {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { participantId, room } = await createRes.json() as { participantId: string; room: { code: string } };

    const res = await get(server.baseUrl, `/rooms/${room.code}?participantId=${participantId}`);
    expect(res.status).toBe(200);
    const data = await res.json() as { room: { isHost: boolean } };
    expect(data.room.isHost).toBe(true);
  });

  it("returns isHost: false when participantId belongs to joiner", async () => {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { room } = await createRes.json() as { room: { code: string } };

    const joinRes = await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "Bob" });
    const { participantId: joinerId } = await joinRes.json() as { participantId: string };

    const res = await get(server.baseUrl, `/rooms/${room.code}?participantId=${joinerId}`);
    const data = await res.json() as { room: { isHost: boolean } };
    expect(data.room.isHost).toBe(false);
  });

  it("returns isHost: false when no participantId provided", async () => {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { room } = await createRes.json() as { room: { code: string } };

    const res = await get(server.baseUrl, `/rooms/${room.code}`);
    const data = await res.json() as { room: { isHost: boolean } };
    expect(data.room.isHost).toBe(false);
  });
});

describe("POST /rooms/:code/start", () => {
  let server: TestServer;

  beforeAll(async () => { server = await startTestServer(); });
  afterAll(async () => { await server.close(); });

  it("returns 200 with status in_game for valid host", async () => {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { participantId, room } = await createRes.json() as { participantId: string; room: { code: string } };
    await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "Bob" });

    const res = await post(server.baseUrl, `/rooms/${room.code}/start`, { participantId });
    expect(res.status).toBe(200);
    const data = await res.json() as { room: { status: string; word: string } };
    expect(data.room.status).toBe("in_game");
  });

  it("includes word in host snapshot after start", async () => {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { participantId, room } = await createRes.json() as { participantId: string; room: { code: string } };
    await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "Bob" });

    const startRes = await post(server.baseUrl, `/rooms/${room.code}/start`, { participantId });
    const data = await startRes.json() as { room: { word: string } };
    expect(data.room.word).toBe("rocket");
  });

  it("omits word from guest snapshot after start", async () => {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { participantId, room } = await createRes.json() as { participantId: string; room: { code: string } };
    const joinRes = await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "Bob" });
    const { participantId: guestId } = await joinRes.json() as { participantId: string };

    await post(server.baseUrl, `/rooms/${room.code}/start`, { participantId });

    const getRes = await get(server.baseUrl, `/rooms/${room.code}?participantId=${guestId}`);
    const data = await getRes.json() as { room: Record<string, unknown> };
    expect(data.room.word).toBeUndefined();
    expect(data.room.drawerParticipantId).toBeTruthy();
  });

  it("returns 403 when caller is not the host", async () => {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { room } = await createRes.json() as { room: { code: string } };
    const joinRes = await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "Bob" });
    const { participantId: guestId } = await joinRes.json() as { participantId: string };

    const res = await post(server.baseUrl, `/rooms/${room.code}/start`, { participantId: guestId });
    expect(res.status).toBe(403);
  });

  it("returns 409 when game already started", async () => {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { participantId, room } = await createRes.json() as { participantId: string; room: { code: string } };
    await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "Bob" });

    await post(server.baseUrl, `/rooms/${room.code}/start`, { participantId });
    const res = await post(server.baseUrl, `/rooms/${room.code}/start`, { participantId });
    expect(res.status).toBe(409);
  });
});

describe("POST /rooms/:code/guesses", () => {
  let server: TestServer;

  beforeAll(async () => { server = await startTestServer(); });
  afterAll(async () => { await server.close(); });

  async function setupGame() {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { participantId: hostId, room } = await createRes.json() as { participantId: string; room: { code: string } };
    const joinRes = await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "Bob" });
    const { participantId: guestId } = await joinRes.json() as { participantId: string };
    await post(server.baseUrl, `/rooms/${room.code}/start`, { participantId: hostId });
    return { code: room.code, hostId, guestId };
  }

  it("returns 201 with isCorrect: true for correct guess", async () => {
    const { code, guestId } = await setupGame();
    const res = await post(server.baseUrl, `/rooms/${code}/guesses`, { participantId: guestId, text: "rocket" });
    expect(res.status).toBe(201);
    const data = await res.json() as { guess: { isCorrect: boolean } };
    expect(data.guess.isCorrect).toBe(true);
  });

  it("awards 100 points for correct guess", async () => {
    const { code, guestId } = await setupGame();
    await post(server.baseUrl, `/rooms/${code}/guesses`, { participantId: guestId, text: "ROCKET" });
    const snapRes = await get(server.baseUrl, `/rooms/${code}?participantId=${guestId}`);
    const data = await snapRes.json() as { room: { participants: Array<{ id: string; score: number }> } };
    const guestScore = data.room.participants.find((p) => p.id === guestId)?.score;
    expect(guestScore).toBe(100);
  });

  it("returns 201 with isCorrect: false for incorrect guess; score unchanged", async () => {
    const { code, guestId } = await setupGame();
    const res = await post(server.baseUrl, `/rooms/${code}/guesses`, { participantId: guestId, text: "pizza" });
    expect(res.status).toBe(201);
    const data = await res.json() as { guess: { isCorrect: boolean }; room: { participants: Array<{ id: string; score: number }> } };
    expect(data.guess.isCorrect).toBe(false);
    const guestScore = data.room.participants.find((p) => p.id === guestId)?.score;
    expect(guestScore).toBe(0);
  });

  it("returns 403 when drawer submits a guess", async () => {
    const { code, hostId } = await setupGame();
    const res = await post(server.baseUrl, `/rooms/${code}/guesses`, { participantId: hostId, text: "rocket" });
    expect(res.status).toBe(403);
  });

  it("returns 400 for empty guess text", async () => {
    const { code, guestId } = await setupGame();
    const res = await post(server.baseUrl, `/rooms/${code}/guesses`, { participantId: guestId, text: "" });
    expect(res.status).toBe(400);
    const data = await res.json() as { message: string };
    expect(data.message).toBe("Guess cannot be empty");
  });

  it("GET /rooms/:code after guess includes guesses array", async () => {
    const { code, guestId } = await setupGame();
    await post(server.baseUrl, `/rooms/${code}/guesses`, { participantId: guestId, text: "pizza" });
    const snapRes = await get(server.baseUrl, `/rooms/${code}?participantId=${guestId}`);
    const data = await snapRes.json() as { room: { guesses: Array<{ text: string }> } };
    expect(data.room.guesses.length).toBe(1);
    expect(data.room.guesses[0].text).toBe("pizza");
  });
});

describe("POST /rooms/:code/strokes", () => {
  let server: TestServer;

  beforeAll(async () => { server = await startTestServer(); });
  afterAll(async () => { await server.close(); });

  async function setupGame() {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { participantId: hostId, room } = await createRes.json() as { participantId: string; room: { code: string } };
    const joinRes = await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "Bob" });
    const { participantId: guestId } = await joinRes.json() as { participantId: string };
    await post(server.baseUrl, `/rooms/${room.code}/start`, { participantId: hostId });
    return { code: room.code, hostId, guestId };
  }

  it("returns 201 and appends stroke for drawer", async () => {
    const { code, hostId } = await setupGame();
    const res = await post(server.baseUrl, `/rooms/${code}/strokes`, {
      participantId: hostId,
      points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
      color: "#1e1e1e",
      lineWidth: 3
    });
    expect(res.status).toBe(201);
    const data = await res.json() as { room: { strokes: unknown[] } };
    expect(data.room.strokes.length).toBe(1);
  });

  it("returns 403 for non-drawer", async () => {
    const { code, guestId } = await setupGame();
    const res = await post(server.baseUrl, `/rooms/${code}/strokes`, {
      participantId: guestId,
      points: [{ x: 0, y: 0 }],
      color: "#000",
      lineWidth: 2
    });
    expect(res.status).toBe(403);
  });

  it("GET /rooms/:code after stroke returns strokes array", async () => {
    const { code, hostId } = await setupGame();
    await post(server.baseUrl, `/rooms/${code}/strokes`, {
      participantId: hostId,
      points: [{ x: 5, y: 5 }],
      color: "#1e1e1e",
      lineWidth: 3
    });
    const snapRes = await get(server.baseUrl, `/rooms/${code}?participantId=${hostId}`);
    const data = await snapRes.json() as { room: { strokes: unknown[] } };
    expect(data.room.strokes.length).toBe(1);
  });
});

describe("DELETE /rooms/:code/strokes", () => {
  let server: TestServer;

  beforeAll(async () => { server = await startTestServer(); });
  afterAll(async () => { await server.close(); });

  async function setupGameWithStroke() {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { participantId: hostId, room } = await createRes.json() as { participantId: string; room: { code: string } };
    const joinRes = await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "Bob" });
    const { participantId: guestId } = await joinRes.json() as { participantId: string };
    await post(server.baseUrl, `/rooms/${room.code}/start`, { participantId: hostId });
    await post(server.baseUrl, `/rooms/${room.code}/strokes`, {
      participantId: hostId,
      points: [{ x: 10, y: 10 }],
      color: "#000",
      lineWidth: 2
    });
    return { code: room.code, hostId, guestId };
  }

  it("returns 200 and clears strokes for drawer", async () => {
    const { code, hostId } = await setupGameWithStroke();
    const res = await post(server.baseUrl, `/rooms/${code}/strokes`, { method: "DELETE", participantId: hostId });
    // Note: using DELETE via helper that posts body
    const deleteRes = await fetch(`${server.baseUrl}/rooms/${code}/strokes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: hostId })
    });
    expect(deleteRes.status).toBe(200);
    const data = await deleteRes.json() as { room: { strokes: unknown[] } };
    expect(data.room.strokes).toEqual([]);
    void res;
  });

  it("returns 403 for non-drawer", async () => {
    const { code, guestId } = await setupGameWithStroke();
    const deleteRes = await fetch(`${server.baseUrl}/rooms/${code}/strokes`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId: guestId })
    });
    expect(deleteRes.status).toBe(403);
  });
});

describe("POST /rooms/:code/end", () => {
  let server: TestServer;

  beforeAll(async () => { server = await startTestServer(); });
  afterAll(async () => { await server.close(); });

  async function setupInGameRoom() {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { participantId: hostId, room } = await createRes.json() as { participantId: string; room: { code: string } };
    const joinRes = await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "Bob" });
    const { participantId: guestId } = await joinRes.json() as { participantId: string };
    await post(server.baseUrl, `/rooms/${room.code}/start`, { participantId: hostId });
    return { code: room.code, hostId, guestId };
  }

  it("returns 200 with status result for host", async () => {
    const { code, hostId } = await setupInGameRoom();
    const res = await post(server.baseUrl, `/rooms/${code}/end`, { participantId: hostId });
    expect(res.status).toBe(200);
    const data = await res.json() as { room: { status: string } };
    expect(data.room.status).toBe("result");
  });

  it("includes word for ALL viewers in result status", async () => {
    const { code, hostId, guestId } = await setupInGameRoom();
    await post(server.baseUrl, `/rooms/${code}/end`, { participantId: hostId });
    const snapRes = await get(server.baseUrl, `/rooms/${code}?participantId=${guestId}`);
    const data = await snapRes.json() as { room: { word: string; status: string } };
    expect(data.room.status).toBe("result");
    expect(data.room.word).toBe("rocket");
  });

  it("returns 403 for non-host", async () => {
    const { code, guestId } = await setupInGameRoom();
    const res = await post(server.baseUrl, `/rooms/${code}/end`, { participantId: guestId });
    expect(res.status).toBe(403);
  });

  it("returns 409 when not in_game", async () => {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { participantId: hostId, room } = await createRes.json() as { participantId: string; room: { code: string } };
    const res = await post(server.baseUrl, `/rooms/${room.code}/end`, { participantId: hostId });
    expect(res.status).toBe(409);
  });
});

describe("POST /rooms/:code/restart", () => {
  let server: TestServer;

  beforeAll(async () => { server = await startTestServer(); });
  afterAll(async () => { await server.close(); });

  async function setupResultRoom() {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { participantId: hostId, room } = await createRes.json() as { participantId: string; room: { code: string } };
    const joinRes = await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "Bob" });
    const { participantId: guestId } = await joinRes.json() as { participantId: string };
    await post(server.baseUrl, `/rooms/${room.code}/start`, { participantId: hostId });
    await post(server.baseUrl, `/rooms/${room.code}/guesses`, { participantId: guestId, text: "rocket" });
    await post(server.baseUrl, `/rooms/${room.code}/end`, { participantId: hostId });
    return { code: room.code, hostId, guestId };
  }

  it("returns 200 with status lobby and scores reset for host", async () => {
    const { code, hostId } = await setupResultRoom();
    const res = await post(server.baseUrl, `/rooms/${code}/restart`, { participantId: hostId });
    expect(res.status).toBe(200);
    const data = await res.json() as { room: { status: string; guesses: unknown[]; participants: Array<{ score: number }> } };
    expect(data.room.status).toBe("lobby");
    expect(data.room.guesses).toEqual([]);
    expect(data.room.participants.every((p) => p.score === 0)).toBe(true);
  });

  it("returns 403 for non-host", async () => {
    const { code, guestId } = await setupResultRoom();
    const res = await post(server.baseUrl, `/rooms/${code}/restart`, { participantId: guestId });
    expect(res.status).toBe(403);
  });

  it("returns 409 when not in result status", async () => {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { participantId: hostId, room } = await createRes.json() as { participantId: string; room: { code: string } };
    await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "Bob" });
    await post(server.baseUrl, `/rooms/${room.code}/start`, { participantId: hostId });
    const res = await post(server.baseUrl, `/rooms/${room.code}/restart`, { participantId: hostId });
    expect(res.status).toBe(409);
  });
});

describe("POST /rooms/:code/exit", () => {
  let server: TestServer;

  beforeAll(async () => { server = await startTestServer(); });
  afterAll(async () => { await server.close(); });

  async function setupInGame() {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { participantId: hostId, room } = await createRes.json() as { participantId: string; room: { code: string } };
    const joinRes = await post(server.baseUrl, `/rooms/${room.code}/join`, { playerName: "Bob" });
    const { participantId: guestId } = await joinRes.json() as { participantId: string };
    await post(server.baseUrl, `/rooms/${room.code}/start`, { participantId: hostId });
    return { code: room.code, hostId, guestId };
  }

  it("returns 200 with status lobby when host exits from in_game", async () => {
    const { code, hostId } = await setupInGame();
    const res = await post(server.baseUrl, `/rooms/${code}/exit`, { participantId: hostId });
    expect(res.status).toBe(200);
    const data = await res.json() as { room: { status: string; guesses: unknown[] } };
    expect(data.room.status).toBe("lobby");
    expect(data.room.guesses).toEqual([]);
  });

  it("returns 200 with status lobby when host exits from result", async () => {
    const { code, hostId } = await setupInGame();
    await post(server.baseUrl, `/rooms/${code}/end`, { participantId: hostId });
    const res = await post(server.baseUrl, `/rooms/${code}/exit`, { participantId: hostId });
    expect(res.status).toBe(200);
    const data = await res.json() as { room: { status: string } };
    expect(data.room.status).toBe("lobby");
  });

  it("returns 403 for non-host", async () => {
    const { code, guestId } = await setupInGame();
    const res = await post(server.baseUrl, `/rooms/${code}/exit`, { participantId: guestId });
    expect(res.status).toBe(403);
  });

  it("returns 409 when room is already in lobby", async () => {
    const createRes = await post(server.baseUrl, "/rooms", { playerName: "Alice" });
    const { participantId: hostId, room } = await createRes.json() as { participantId: string; room: { code: string } };
    const res = await post(server.baseUrl, `/rooms/${room.code}/exit`, { participantId: hostId });
    expect(res.status).toBe(409);
  });
});
