export function validatePlayerName(name: string): string | null {
  return name.trim().length === 0 ? "Player name is required" : null;
}

export function validateRoomCode(code: string): string | null {
  return code.trim().length === 0 ? "Room code is required" : null;
}

export function validateGuess(text: string): string | null {
  return text.trim().length === 0 ? "Guess cannot be empty" : null;
}
