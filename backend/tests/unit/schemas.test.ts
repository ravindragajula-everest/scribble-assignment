import { describe, it, expect } from "vitest";
import { createRoomSchema, joinRoomSchema, roomCodeParamsSchema } from "../../src/api/schemas.js";

describe("createRoomSchema", () => {
  it("rejects empty playerName with 'Player name is required'", () => {
    expect(() => createRoomSchema.parse({ playerName: "" })).toThrow("Player name is required");
  });

  it("rejects whitespace-only playerName with 'Player name is required'", () => {
    expect(() => createRoomSchema.parse({ playerName: "   " })).toThrow("Player name is required");
  });

  it("accepts and trims a valid playerName", () => {
    const result = createRoomSchema.parse({ playerName: "  Alice  " });
    expect(result.playerName).toBe("Alice");
  });
});

describe("joinRoomSchema", () => {
  it("rejects empty playerName", () => {
    expect(() => joinRoomSchema.parse({ playerName: "" })).toThrow("Player name is required");
  });

  it("accepts trimmed playerName", () => {
    const result = joinRoomSchema.parse({ playerName: "Bob" });
    expect(result.playerName).toBe("Bob");
  });
});

describe("roomCodeParamsSchema", () => {
  it("rejects empty code with 'Room code is required'", () => {
    expect(() => roomCodeParamsSchema.parse({ code: "" })).toThrow("Room code is required");
  });

  it("rejects whitespace-only code", () => {
    expect(() => roomCodeParamsSchema.parse({ code: "   " })).toThrow("Room code is required");
  });

  it("accepts a valid code", () => {
    const result = roomCodeParamsSchema.parse({ code: "ABCD" });
    expect(result.code).toBe("ABCD");
  });
});
