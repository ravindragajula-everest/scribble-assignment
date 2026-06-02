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
