import type { Guess } from "../services/api";
import { Card } from "./Card";

interface ResultPanelProps {
  guesses: Guess[];
  status?: "lobby" | "in_game" | "result";
}

export function ResultPanel({ guesses, status = "in_game" }: Readonly<ResultPanelProps>) {
  const showResult = status === "result";

  return (
    <Card title="Activity">
      {guesses.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>No guesses yet.</p>
      ) : (
        <ul className="player-list">
          {guesses.map((g) => (
            <li key={g.id} style={{ color: showResult && g.isCorrect ? "#16a34a" : undefined }}>
              <span>
                <strong>{g.participantName}</strong>: {g.text}
              </span>
              {showResult && <span>{g.isCorrect ? "✓" : "✗"}</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
