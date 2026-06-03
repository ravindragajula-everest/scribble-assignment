import type { Guess } from "../services/api";
import { Card } from "./Card";

interface ResultPanelProps {
  guesses: Guess[];
}

export function ResultPanel({ guesses }: Readonly<ResultPanelProps>) {
  return (
    <Card title="Activity">
      {guesses.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>No guesses yet.</p>
      ) : (
        <ul className="player-list">
          {guesses.map((g) => (
            <li key={g.id} style={{ color: g.isCorrect ? "#16a34a" : undefined }}>
              <span>
                <strong>{g.participantName}</strong>: {g.text}
              </span>
              <span>{g.isCorrect ? "✓" : "✗"}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
