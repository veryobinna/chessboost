"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import type { DrillCard } from "@/lib/drill";
import { START_FEN } from "@/lib/drill";
import { recordDrillSession, type DrillResult } from "@/app/repertoires/[id]/drill/actions";

type Phase = "await" | "right" | "wrong";

const GREEN = "rgba(34, 197, 94, 0.45)";
const YELLOW = "rgba(245, 158, 11, 0.35)";
const RED = "rgba(239, 68, 68, 0.45)";
const SELECT = "rgba(245, 158, 11, 0.55)";
const DOT = "radial-gradient(circle, rgba(245, 158, 11, 0.6) 22%, transparent 24%)";

function contextLine(context: { san: string; ply: number }[]): string {
  return context
    .map((m) => {
      const num = Math.ceil(m.ply / 2);
      return m.ply % 2 === 1 ? `${num}.${m.san}` : m.san;
    })
    .join(" ");
}

export default function DrillBoard({
  color,
  repertoireId,
  queue,
}: {
  color: "WHITE" | "BLACK";
  repertoireId: string;
  queue: DrillCard[];
}) {
  const total = queue.length;
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("await");
  const [boardFen, setBoardFen] = useState(queue[0]?.questionFen ?? START_FEN);
  const [wrongSquare, setWrongSquare] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const results = useRef<DrillResult[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const card = queue[idx];
  const turnChar = color === "WHITE" ? "w" : "b";

  // Reset the board for each new card.
  useEffect(() => {
    if (done || !card) return;
    setBoardFen(card.questionFen);
    setPhase("await");
    setWrongSquare(null);
    setSelected(null);
  }, [idx, done, card]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const finish = useCallback(async () => {
    setDone(true);
    setSaving(true);
    try {
      await recordDrillSession(repertoireId, results.current);
    } finally {
      setSaving(false);
    }
  }, [repertoireId]);

  const advance = useCallback(() => {
    if (idx + 1 >= total) {
      void finish();
    } else {
      setIdx((i) => i + 1);
    }
  }, [idx, total, finish]);

  // Shared move handling for both drag-drop and click-to-move. Returns true
  // only when the move is the correct repertoire move (so the dragged piece
  // settles); illegal or wrong moves return false.
  const attemptMove = useCallback(
    (from: string, to: string): boolean => {
      if (phase !== "await" || !card) return false;

      const chess = new Chess(card.questionFen);
      let move;
      try {
        move = chess.move({ from, to, promotion: "q" });
      } catch {
        return false; // illegal
      }
      if (!move) return false;

      setSelected(null);
      const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
      const correct = uci === card.expectedUci;
      results.current.push({ moveNodeId: card.moveNodeId, correct });

      if (correct) {
        setBoardFen(chess.fen());
        setPhase("right");
        timer.current = setTimeout(advance, 850);
        return true;
      }

      setWrongSquare(to);
      setPhase("wrong");
      return false; // keep the question position; we reveal the right move
    },
    [phase, card, advance],
  );

  const onPieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (!targetSquare) return false;
      return attemptMove(sourceSquare, targetSquare);
    },
    [attemptMove],
  );

  // Click-to-move: first click selects your piece, second click moves it.
  const onSquareClick = useCallback(
    ({ piece, square }: { piece: { pieceType: string } | null; square: string }) => {
      if (phase !== "await" || !card) return;
      const isOwnPiece = !!piece && piece.pieceType[0] === turnChar;

      if (selected) {
        if (square === selected) {
          setSelected(null);
        } else if (isOwnPiece) {
          setSelected(square); // switch selection
        } else {
          attemptMove(selected, square);
        }
        return;
      }
      if (isOwnPiece) setSelected(square);
    },
    [phase, card, selected, turnChar, attemptMove],
  );

  // Legal destinations for the selected piece (for move-hint dots).
  const legalTargets = useMemo<string[]>(() => {
    if (!selected || !card) return [];
    const chess = new Chess(card.questionFen);
    return chess
      .moves({ square: selected as Square, verbose: true })
      .map((m) => m.to);
  }, [selected, card]);

  // Highlights and arrows for the current phase.
  const squareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    if (!card) return {};
    if (phase === "await") {
      const styles: Record<string, React.CSSProperties> = {};
      if (card.lastOpponentMove) {
        styles[card.lastOpponentMove.from] = { backgroundColor: YELLOW };
        styles[card.lastOpponentMove.to] = { backgroundColor: YELLOW };
      }
      for (const sq of legalTargets) {
        styles[sq] = { ...(styles[sq] ?? {}), backgroundImage: DOT };
      }
      if (selected) styles[selected] = { backgroundColor: SELECT };
      return styles;
    }
    if (phase === "wrong") {
      const from = card.expectedUci.slice(0, 2);
      const to = card.expectedUci.slice(2, 4);
      const styles: Record<string, React.CSSProperties> = {
        [from]: { backgroundColor: GREEN },
        [to]: { backgroundColor: GREEN },
      };
      if (wrongSquare) styles[wrongSquare] = { backgroundColor: RED };
      return styles;
    }
    return {};
  }, [card, phase, wrongSquare, selected, legalTargets]);

  const arrows = useMemo(() => {
    if (phase === "wrong" && card) {
      return [
        {
          startSquare: card.expectedUci.slice(0, 2),
          endSquare: card.expectedUci.slice(2, 4),
          color: "rgb(34, 197, 94)",
        },
      ];
    }
    return [];
  }, [phase, card]);

  // Keyboard: Enter/Space advances when reviewing a miss.
  useEffect(() => {
    if (phase !== "wrong") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, advance]);

  function restart() {
    if (timer.current) clearTimeout(timer.current);
    results.current = [];
    setDone(false);
    setIdx(0);
    setBoardFen(queue[0]?.questionFen ?? START_FEN);
    setPhase("await");
    setWrongSquare(null);
  }

  if (total === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <p className="text-muted">
          This repertoire has no moves of your color to drill yet.
        </p>
        <Link
          href={`/repertoires/${repertoireId}`}
          className="mt-3 inline-block text-accent hover:underline"
        >
          ← Back to repertoire
        </Link>
      </div>
    );
  }

  if (done) {
    const right = results.current.filter((r) => r.correct).length;
    const n = results.current.length || 1;
    const pct = Math.round((right / n) * 100);
    const missed = queue.filter((c) =>
      results.current.some((r) => r.moveNodeId === c.moveNodeId && !r.correct),
    );
    return (
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-8 text-center">
        <h2 className="text-2xl font-bold">Session complete</h2>
        <div className="my-6 text-5xl font-bold text-accent">{pct}%</div>
        <p className="text-muted">
          {right} / {results.current.length} correct
          {saving && " · saving…"}
        </p>

        {missed.length > 0 && (
          <div className="mt-6 text-left">
            <h3 className="mb-2 text-sm font-semibold text-muted">
              Review these
            </h3>
            <ul className="flex flex-col gap-1 text-sm">
              {missed.map((c) => (
                <li key={c.moveNodeId} className="text-muted">
                  <span className="text-foreground">{c.expectedSan}</span>
                  {c.context.length > 0 && (
                    <span className="ml-2 text-xs">
                      after {contextLine(c.context)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex justify-center gap-3">
          <button
            onClick={restart}
            className="rounded-lg bg-accent px-5 py-2.5 font-semibold text-stone-950 transition hover:opacity-90"
          >
            Drill again
          </button>
          <Link
            href={`/repertoires/${repertoireId}`}
            className="rounded-lg border border-border px-5 py-2.5 transition hover:border-accent"
          >
            Done
          </Link>
        </div>
      </div>
    );
  }

  const youAre = color === "WHITE" ? "White" : "Black";

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,480px)_1fr]">
      <div className="flex flex-col gap-3">
        <div className="w-full max-w-[480px]">
          <Chessboard
            options={{
              id: "drill-board",
              position: boardFen,
              boardOrientation: color === "BLACK" ? "black" : "white",
              allowDragging: phase === "await",
              onPieceDrop,
              onSquareClick,
              squareStyles,
              arrows,
              animationDurationInMs: 200,
            }}
          />
        </div>
        {/* Progress */}
        <div className="flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-card">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${(idx / total) * 100}%` }}
            />
          </div>
          <span className="text-sm text-muted">
            {idx + 1} / {total}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {card.context.length > 0 ? (
          <p className="font-mono text-sm text-muted">
            {contextLine(card.context)} <span className="text-accent">…?</span>
          </p>
        ) : (
          <p className="text-sm text-muted">Starting position</p>
        )}

        {phase === "await" && (
          <p className="text-lg font-semibold">
            {youAre} to move — play your line.
          </p>
        )}
        {phase === "right" && (
          <p className="text-lg font-semibold text-green-400">
            ✓ {card.expectedSan} — correct!
          </p>
        )}
        {phase === "wrong" && (
          <div className="flex flex-col gap-3">
            <p className="text-lg font-semibold text-red-400">
              Not your line. The move is{" "}
              <span className="text-foreground">{card.expectedSan}</span>.
            </p>
            <button
              onClick={advance}
              className="self-start rounded-lg bg-accent px-5 py-2.5 font-semibold text-stone-950 transition hover:opacity-90"
            >
              Next →
            </button>
          </div>
        )}

        <Link
          href={`/repertoires/${repertoireId}`}
          className="mt-auto text-sm text-muted hover:underline"
        >
          End session
        </Link>
      </div>
    </div>
  );
}
