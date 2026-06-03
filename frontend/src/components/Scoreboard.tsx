import type { Participant } from "../services/api";
import { Card } from "./Card";

interface ScoreboardProps {
  participants: Participant[];
  status?: "lobby" | "in_game" | "result";
}

export function Scoreboard({ participants, status = "in_game" }: Readonly<ScoreboardProps>) {
  const showScores = status === "result";
  const sorted = showScores
    ? [...participants].sort((a, b) => b.score - a.score)
    : participants;

  return (
    <Card title="Scoreboard">
      {sorted.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Waiting for players...</p>
      ) : (
        <ul className="player-list">
          {sorted.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              {showScores ? <strong>{p.score}</strong> : <span>—</span>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
