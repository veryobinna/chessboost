"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { nagInfo } from "@/lib/nag";

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const SELECT = "rgba(245, 158, 11, 0.55)";
const DOT = "radial-gradient(circle, rgba(245, 158, 11, 0.6) 22%, transparent 24%)";
const HINT = "rgb(56, 189, 248)";

export type LessonNode = {
  id: string;
  parentId: string | null;
  ply: number;
  san: string;
  uci: string;
  fenAfter: string;
  isPlayerMove: boolean;
  comment: string | null;
  nag: number | null;
};

function label(n: { san: string; ply: number; nag?: number | null }): string {
  const num = Math.ceil(n.ply / 2);
  const prefix = n.ply % 2 === 1 ? `${num}.` : `${num}…`;
  const info = nagInfo(n.nag);
  return `${prefix}${n.san}${info?.glyph ?? ""}`;
}

export default function LessonBoard({
  color,
  intro,
  nodes,
}: {
  color: "WHITE" | "BLACK";
  intro: string | null;
  nodes: LessonNode[];
}) {
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const childrenOf = useMemo(() => {
    const m = new Map<string, LessonNode[]>();
    for (const n of nodes) {
      const k = n.parentId ?? "root";
      (m.get(k) ?? m.set(k, []).get(k)!).push(n);
    }
    return m;
  }, [nodes]);

  const [path, setPath] = useState<LessonNode[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [nudge, setNudge] = useState(false);

  const current = path[path.length - 1] ?? null;
  const fen = current?.fenAfter ?? START_FEN;
  const children = childrenOf.get(current?.id ?? "root") ?? [];
  const mainChild = children[0] ?? null;
  const branches = children.slice(1);
  const turnChar = fen.split(" ")[1] === "b" ? "b" : "w";
  const turnName = turnChar === "w" ? "White" : "Black";
  const playerChar = color === "WHITE" ? "w" : "b";
  const isPlayerTurn = turnChar === playerChar;
  // The opponent pauses only when there are several replies to study.
  const opponentChoosing = !isPlayerTurn && children.length > 1;

  useEffect(() => setSelected(null), [path.length]);

  const play = useCallback((node: LessonNode) => {
    setNudge(false);
    setSelected(null);
    setPath((p) => [...p, node]);
  }, []);

  // The system plays the opponent's side: when it's not the player's turn and
  // there is a single reply in the course, play it after a short beat.
  useEffect(() => {
    if (isPlayerTurn || children.length !== 1) return;
    const t = setTimeout(() => play(children[0]), 700);
    return () => clearTimeout(t);
  }, [isPlayerTurn, children, play]);

  const tryMove = useCallback(
    (from: string, to: string): boolean => {
      const chess = new Chess(fen);
      let move;
      try {
        move = chess.move({ from, to, promotion: "q" });
      } catch {
        return false;
      }
      if (!move) return false;
      const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
      const match = children.find((c) => c.uci === uci);
      if (match) {
        play(match);
        return true;
      }
      setNudge(true); // legal, but not part of this repertoire
      setSelected(null);
      return false;
    },
    [fen, children, play],
  );

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) =>
      targetSquare ? tryMove(sourceSquare, targetSquare) : false,
    [tryMove],
  );

  const onSquareClick = useCallback(
    ({ piece, square }: { piece: { pieceType: string } | null; square: string }) => {
      const own = !!piece && piece.pieceType[0] === turnChar;
      if (selected) {
        if (square === selected) setSelected(null);
        else if (own) setSelected(square);
        else tryMove(selected, square);
        return;
      }
      if (own) setSelected(square);
    },
    [selected, turnChar, tryMove],
  );

  const legalTargets = useMemo<string[]>(() => {
    if (!selected) return [];
    const chess = new Chess(fen);
    return chess.moves({ square: selected as Square, verbose: true }).map((m) => m.to);
  }, [selected, fen]);

  const squareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const s: Record<string, React.CSSProperties> = {};
    for (const sq of legalTargets) s[sq] = { backgroundImage: DOT };
    if (selected) s[selected] = { backgroundColor: SELECT };
    return s;
  }, [legalTargets, selected]);

  // A gentle arrow hint — only when it's the player's move to find.
  const arrows = useMemo(() => {
    if (!mainChild || !isPlayerTurn) return [];
    return [
      {
        startSquare: mainChild.uci.slice(0, 2),
        endSquare: mainChild.uci.slice(2, 4),
        color: HINT,
      },
    ];
  }, [mainChild, isPlayerTurn]);

  // Back = undo your last move (and the opponent's reply before it), landing
  // on a position where it's your turn again — otherwise the auto-reply would
  // immediately re-play what we just undid.
  const goBack = useCallback(() => {
    setNudge(false);
    setPath((p) => {
      let np = p.slice(0, -1);
      while (np.length > 0) {
        const f = np[np.length - 1]?.fenAfter ?? START_FEN;
        if ((f.split(" ")[1] === "b" ? "b" : "w") === playerChar) break;
        // Opponent to move with a single scripted reply → keep popping.
        const kids = childrenOf.get(np[np.length - 1]?.id ?? "root") ?? [];
        if (kids.length > 1) break; // a choice point is a fine place to stop
        np = np.slice(0, -1);
      }
      return np;
    });
  }, [playerChar, childrenOf]);

  const info = nagInfo(current?.nag);
  const atStart = path.length === 0;

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,480px)_1fr]">
      <div className="flex flex-col gap-3">
        <div className="w-full max-w-[480px]">
          <Chessboard
            options={{
              id: "lesson-board",
              position: fen,
              boardOrientation: color === "BLACK" ? "black" : "white",
              allowDragging: true,
              onPieceDrop,
              onSquareClick,
              squareStyles,
              arrows,
              animationDurationInMs: 200,
            }}
          />
        </div>
        <div className="flex gap-2">
          <Nav onClick={() => setPath([])} disabled={atStart}>
            ⏮ Restart
          </Nav>
          <Nav onClick={goBack} disabled={atStart}>
            ‹ Back
          </Nav>
          <Nav onClick={() => mainChild && play(mainChild)} disabled={!mainChild}>
            Next ›
          </Nav>
        </div>
        {/* Line so far */}
        <div className="flex flex-wrap gap-1.5">
          {path.map((n, i) => (
            <button
              key={n.id}
              onClick={() => setPath((p) => p.slice(0, i + 1))}
              className={`rounded px-2 py-1 text-xs font-medium ${
                i === path.length - 1 ? "bg-accent text-stone-950" : "bg-card hover:bg-border"
              }`}
            >
              {label(n)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Coaching panel — commentary + what to do, in one card */}
        <div
          className={`rounded-xl border p-4 ${
            !atStart && info?.bad
              ? "border-red-900/60 bg-red-950/30"
              : "border-border bg-card"
          }`}
        >
          {atStart ? (
            <p className="text-foreground">
              {intro?.trim() ||
                "Let's walk through this opening. Follow the highlighted move to begin."}
            </p>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{current && label(current)}</span>
                {info && (
                  <span className={`text-sm font-semibold ${info.className}`}>
                    {info.label}
                  </span>
                )}
              </div>
              {current?.comment && (
                <p className="mt-2 text-sm text-muted">{current.comment}</p>
              )}
              {info?.bad && childrenOf.get(current!.id)?.length ? (
                <p className="mt-2 text-xs text-red-300">
                  ↓ Play on to see why it fails.
                </p>
              ) : null}
            </>
          )}

          <div className="mt-3 border-t border-border pt-3 text-sm">
            {!mainChild ? (
              <p className="text-muted">
                End of this line. Use ‹ Back or ⏮ Restart to explore another.
              </p>
            ) : isPlayerTurn ? (
              <p>
                <span className="font-semibold text-sky-300">Your move.</span>{" "}
                Play <span className="font-semibold">{mainChild.san}</span> — drag it,
                or{" "}
                <button
                  onClick={() => play(mainChild)}
                  className="underline underline-offset-2 hover:text-accent"
                >
                  skip ahead
                </button>
                .
                {nudge && (
                  <span className="mt-1 block text-xs text-orange-300">
                    That&apos;s legal, but not our line — try {mainChild.san}.
                  </span>
                )}
              </p>
            ) : opponentChoosing ? (
              <p>
                <span className="font-semibold text-sky-300">
                  {turnName} has {children.length} main tries here.
                </span>{" "}
                Pick the reply you want to study below.
              </p>
            ) : (
              <p className="text-muted">{turnName} is replying…</p>
            )}
          </div>
        </div>

        {/* Opponent choice point: pick which reply to study */}
        {opponentChoosing && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted">
              What will {turnName} play?
            </h3>
            <div className="flex flex-wrap gap-2">
              {children.map((n, i) => {
                const bi = nagInfo(n.nag);
                return (
                  <button
                    key={n.id}
                    onClick={() => play(n)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:border-accent ${
                      bi?.bad
                        ? "border-red-900/60 bg-red-950/20"
                        : i === 0
                          ? "border-accent/50 bg-accent/10"
                          : "border-border bg-card"
                    }`}
                    title={bi?.label ?? (i === 0 ? "Main line" : undefined)}
                  >
                    {n.san}
                    {bi && <span className={`ml-1 ${bi.className}`}>{bi.glyph}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Player's own alternatives at this position */}
        {isPlayerTurn && branches.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted">
              Also playable here
            </h3>
            <div className="flex flex-wrap gap-2">
              {branches.map((n) => {
                const bi = nagInfo(n.nag);
                return (
                  <button
                    key={n.id}
                    onClick={() => play(n)}
                    className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:border-accent ${
                      bi?.bad
                        ? "border-red-900/60 bg-red-950/20"
                        : "border-border bg-card"
                    }`}
                    title={bi?.label}
                  >
                    {n.san}
                    {bi && <span className={`ml-1 ${bi.className}`}>{bi.glyph}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Nav({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-border bg-card px-3 py-1.5 text-sm transition hover:border-accent disabled:opacity-40"
    >
      {children}
    </button>
  );
}
