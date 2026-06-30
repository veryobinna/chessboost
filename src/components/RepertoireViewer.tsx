"use client";

import { useMemo, useState } from "react";
import { Chessboard } from "react-chessboard";

export type ViewerNode = {
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

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const NAG_GLYPH: Record<number, string> = {
  1: "!",
  2: "?",
  3: "!!",
  4: "??",
  5: "!?",
  6: "?!",
};

function moveLabel(node: ViewerNode): string {
  const num = Math.ceil(node.ply / 2);
  const isWhite = node.ply % 2 === 1;
  const prefix = isWhite ? `${num}.` : `${num}…`;
  const glyph = node.nag ? (NAG_GLYPH[node.nag] ?? "") : "";
  return `${prefix} ${node.san}${glyph}`;
}

export default function RepertoireViewer({
  color,
  nodes,
}: {
  color: "WHITE" | "BLACK";
  nodes: ViewerNode[];
}) {
  // Group children by parent ("root" for the starting position).
  const childrenOf = useMemo(() => {
    const map = new Map<string, ViewerNode[]>();
    for (const n of nodes) {
      const key = n.parentId ?? "root";
      const list = map.get(key) ?? [];
      list.push(n);
      map.set(key, list);
    }
    return map;
  }, [nodes]);

  // The line currently being viewed (root → current node).
  const [path, setPath] = useState<ViewerNode[]>([]);

  const current = path[path.length - 1];
  const fen = current?.fenAfter ?? START_FEN;
  const options = childrenOf.get(current?.id ?? "root") ?? [];

  const goTo = (depth: number) => setPath((p) => p.slice(0, depth));
  const play = (node: ViewerNode) => setPath((p) => [...p, node]);
  const back = () => setPath((p) => p.slice(0, -1));
  const forwardMain = () => {
    if (options[0]) play(options[0]);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,480px)_1fr]">
      <div className="flex flex-col gap-3">
        <div className="w-full max-w-[480px]">
          <Chessboard
            options={{
              id: "repertoire-viewer",
              position: fen,
              boardOrientation: color === "BLACK" ? "black" : "white",
              allowDragging: false,
            }}
          />
        </div>
        <div className="flex gap-2">
          <NavBtn onClick={() => goTo(0)} disabled={path.length === 0}>
            ⏮ Start
          </NavBtn>
          <NavBtn onClick={back} disabled={path.length === 0}>
            ‹ Back
          </NavBtn>
          <NavBtn onClick={forwardMain} disabled={options.length === 0}>
            Next ›
          </NavBtn>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {/* The line played so far */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">Line</h3>
          <div className="flex flex-wrap gap-1.5">
            {path.length === 0 && (
              <span className="text-sm text-muted">Starting position</span>
            )}
            {path.map((node, i) => (
              <button
                key={node.id}
                onClick={() => goTo(i + 1)}
                className={`rounded px-2 py-1 text-sm font-medium transition ${
                  i === path.length - 1
                    ? "bg-accent text-stone-950"
                    : "bg-card hover:bg-border"
                } ${node.isPlayerMove ? "" : "text-muted"}`}
                title={node.isPlayerMove ? "Your move (a card)" : "Opponent move"}
              >
                {moveLabel(node)}
              </button>
            ))}
          </div>
        </div>

        {/* Annotation for the current move */}
        {current?.comment && (
          <p className="rounded-lg border border-border bg-card p-3 text-sm italic text-muted">
            {current.comment}
          </p>
        )}

        {/* Available continuations from here */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">
            {options.length > 0 ? "Continue with" : "End of line"}
          </h3>
          <div className="flex flex-wrap gap-2">
            {options.map((node) => (
              <button
                key={node.id}
                onClick={() => play(node)}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:border-accent ${
                  node.isPlayerMove
                    ? "border-accent/50 bg-accent/10"
                    : "border-border bg-card"
                }`}
              >
                {moveLabel(node)}
              </button>
            ))}
          </div>
          {options.length > 1 && (
            <p className="mt-2 text-xs text-muted">
              {options.length} branches at this position.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function NavBtn({
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
