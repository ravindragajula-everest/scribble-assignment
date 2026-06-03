import { useState } from "react";
import { useRoomState, useRoomStore } from "../state/roomStore";
import { validateGuess } from "../utils/validation";

export function GuessForm() {
  const roomStore = useRoomStore();
  const { room } = useRoomState();
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Drawer cannot submit guesses
  if (room?.isHost) return null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const err = validateGuess(text);
    if (err) {
      setError(err);
      return;
    }

    try {
      setError(null);
      await roomStore.submitGuess(text.trim());
      setText("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to submit guess");
    }
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label className="form__field">
        <span>Your guess</span>
        <input
          className="form__input"
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Type your guess here..."
          aria-describedby={error ? "guess-error" : undefined}
        />
      </label>
      {error && (
        <p id="guess-error" className="form__error" aria-live="polite">
          {error}
        </p>
      )}
      <div className="button-row button-row--compact">
        <button className="button button--primary" type="submit">
          Submit Guess
        </button>
      </div>
    </form>
  );
}
