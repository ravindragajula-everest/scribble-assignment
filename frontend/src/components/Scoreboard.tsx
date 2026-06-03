import type { Participant } from "../services/api";
import { Card } from "./Card";

interface ScoreboardProps {
  participants: Participant[];
}

export function Scoreboard({ participants }: Readonly<ScoreboardProps>) {
  const sorted = [...participants].sort((a, b) => b.score - a.score);

  return (
    <Card title="Scoreboard">
      {sorted.length === 0 ? (
        <p style={{ fontSize: "0.875rem", color: "#6b7280" }}>Waiting for players...</p>
      ) : (
        <ul className="player-list">
          {sorted.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              <strong>{p.score}</strong>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
