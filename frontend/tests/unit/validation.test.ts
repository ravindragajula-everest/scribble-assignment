import { describe, it, expect } from "vitest";
import { validateGuess, validatePlayerName, validateRoomCode } from "../../src/utils/validation.js";

describe("validatePlayerName", () => {
  it("returns error for empty string", () => {
    expect(validatePlayerName("")).toBe("Player name is required");
  });

  it("returns error for whitespace-only string", () => {
    expect(validatePlayerName("   ")).toBe("Player name is required");
  });

  it("returns null for a valid name", () => {
    expect(validatePlayerName("Alice")).toBeNull();
  });

  it("returns null for a name with surrounding spaces", () => {
    expect(validatePlayerName("  Alice  ")).toBeNull();
  });
});

describe("validateRoomCode", () => {
  it("returns error for empty string", () => {
    expect(validateRoomCode("")).toBe("Room code is required");
  });

  it("returns error for whitespace-only string", () => {
    expect(validateRoomCode("   ")).toBe("Room code is required");
  });

  it("returns null for a valid code", () => {
    expect(validateRoomCode("ABCD")).toBeNull();
  });
});

describe("validateGuess", () => {
  it("returns error for empty string", () => {
    expect(validateGuess("")).toBe("Guess cannot be empty");
  });

  it("returns error for whitespace-only string", () => {
    expect(validateGuess("   ")).toBe("Guess cannot be empty");
  });

  it("returns null for a valid guess", () => {
    expect(validateGuess("rocket")).toBeNull();
  });

  it("returns null for a guess with surrounding spaces", () => {
    expect(validateGuess("  ROCKET  ")).toBeNull();
  });
});
