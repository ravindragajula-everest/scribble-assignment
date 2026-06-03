import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/Card";
import { GuessForm } from "../components/GuessForm";
import { ResultPanel } from "../components/ResultPanel";
import { RoomCodeBadge } from "../components/RoomCodeBadge";
import { Scoreboard } from "../components/Scoreboard";
import { useRoomState, useRoomStore } from "../state/roomStore";

export function GamePage() {
  const navigate = useNavigate();
  const roomStore = useRoomStore();
  const { room, participantId } = useRoomState();

  // Drawer canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const pointsRef = useRef<Array<{ x: number; y: number }>>([]);

  // Guesser read-only canvas ref
  const guestCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!room) {
      navigate("/", { replace: true });
    } else if (room.status === "lobby") {
      navigate("/lobby", { replace: true });
    }
  }, [navigate, room]);

  // 2-second polling
  useEffect(() => {
    const id = setInterval(() => {
      roomStore.fetchRoom().catch(() => {});
    }, 2000);
    return () => clearInterval(id);
  }, [roomStore]);

  // Guesser: re-render all strokes whenever room.strokes changes
  useEffect(() => {
    if (room?.isHost || !guestCanvasRef.current) return;
    const ctx = guestCanvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, guestCanvasRef.current.width, guestCanvasRef.current.height);
    for (const stroke of room?.strokes ?? []) {
      if (stroke.points.length < 1) continue;
      ctx.beginPath();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.lineWidth;
      ctx.lineCap = "round";
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
    }
  }, [room?.strokes, room?.isHost]);

  if (room?.status !== "in_game") {
    return null;
  }

  const viewer = room.participants.find((p) => p.id === participantId) ?? null;
  const drawerName =
    room.participants.find((p) => p.id === room.drawerParticipantId)?.name ?? "Unknown";

  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    isDrawingRef.current = true;
    const pos = getPos(e);
    lastPos.current = pos;
    pointsRef.current = [pos];
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1e1e1e";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
    lastPos.current = pos;
    pointsRef.current.push(pos);
  }

  // async — React invokes as fire-and-forget; no wrapper needed in JSX attributes
  async function stopDraw() {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    if (pointsRef.current.length > 0) {
      await roomStore.addStroke(pointsRef.current).catch(() => {});
      pointsRef.current = [];
    }
  }

  async function clearCanvas() {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    await roomStore.clearStrokes().catch(() => {});
  }

  return (
    <section className="panel game-page">
      <div className="game-page__header">
        <div className="game-page__header-left">
          <span className="section-kicker">Round 1</span>
          <h1 className="game-page__title">Guess the Word!</h1>
        </div>
        <RoomCodeBadge code={room.code} />
      </div>

      <div className="game-page__layout">
        <aside className="game-page__sidebar game-page__sidebar--left">
          <Scoreboard participants={room.participants} />
          <ResultPanel guesses={room.guesses} />
        </aside>

        <div className="game-page__main">
          <Card title="Canvas">
            {room.isHost ? (
              <>
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={500}
                  style={{
                    border: "1px solid #e5e7eb",
                    cursor: "crosshair",
                    backgroundColor: "#ffffff",
                    display: "block",
                    maxWidth: "100%"
                  }}
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  aria-label="Drawing canvas"
                />
                <div className="button-row" style={{ marginTop: "8px" }}>
                  <button
                    className="button button--secondary"
                    onClick={() => { void clearCanvas(); }}
                  >
                    Clear Canvas
                  </button>
                </div>
              </>
            ) : (
              <canvas
                ref={guestCanvasRef}
                width={800}
                height={500}
                style={{
                  border: "1px solid #e5e7eb",
                  backgroundColor: "#ffffff",
                  display: "block",
                  maxWidth: "100%"
                }}
                aria-label="Drawing canvas (read-only)"
              />
            )}
          </Card>
        </div>

        <aside className="game-page__sidebar game-page__sidebar--right">
          <Card title="Player Info">
            <dl className="detail-list">
              <div>
                <dt>Name</dt>
                <dd>{viewer?.name ?? "Unknown player"}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{room.isHost ? "Drawer" : "Guesser"}</dd>
              </div>
              <div>
                <dt>Drawer</dt>
                <dd>{drawerName}</dd>
              </div>
              {room.isHost && room.word && (
                <div>
                  <dt>Secret Word</dt>
                  <dd aria-label="Secret word">{room.word}</dd>
                </div>
              )}
              <div>
                <dt>Status</dt>
                <dd>Playing</dd>
              </div>
            </dl>
          </Card>

          <Card title="Your Guess">
            <GuessForm />
          </Card>
        </aside>
      </div>

      <div className="button-row">
        <button className="button button--secondary" onClick={() => navigate("/lobby")}>
          Exit Game
        </button>
      </div>
    </section>
  );
}
