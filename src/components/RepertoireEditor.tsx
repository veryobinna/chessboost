"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import { START_FEN } from "@/lib/drill";
import {
  addMoveAction,
  deleteNodeAction,
  setCommentAction,
  type EditorNode,
} from "@/app/repertoires/[id]/edit/actions";

const SELECT = "rgba(245, 158, 11, 0.55)";
const DOT = "radial-gradient(circle, rgba(245, 158, 11, 0.6) 22%, transparent 24%)";

function moveLabel(n: { san: string; ply: number }): string {
  const num = Math.ceil(n.ply / 2);
  return n.ply % 2 === 1 ? `${num}.${n.san}` : n.san;
}

export default function RepertoireEditor({
  repertoireId,
  color,
  initialNodes,
}: {
  repertoireId: string;
  color: "WHITE" | "BLACK";
  initialNodes: EditorNode[];
}) {
  const [nodes, setNodes] = useState<EditorNode[]>(initialNodes);
  const [path, setPath] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");

  const byId = useMemo(
    () => new Map(nodes.map((n) => [n.id, n])),
    [nodes],
  );
  const childrenOf = useMemo(() => {
    const map = new Map<string, EditorNode[]>();
    for (const n of nodes) {
      const key = n.parentId ?? "root";
      const list = map.get(key) ?? [];
      list.push(n);
      map.set(key, list);
    }
    return map;
  }, [nodes]);

  const currentId = path.length ? path[path.length - 1] : null;
  const currentNode = currentId ? byId.get(currentId) : null;
  const currentFen = currentNode?.fenAfter ?? START_FEN;
  const options = childrenOf.get(currentId ?? "root") ?? [];
  const lineNodes = path.map((id) => byId.get(id)).filter(Boolean) as EditorNode[];
  const turnChar = currentFen.split(" ")[1] === "b" ? "b" : "w";

  // Keep the comment box in sync with the selected node.
  useEffect(() => {
    setCommentDraft(currentNode?.comment ?? "");
    setSelected(null);
  }, [currentId, currentNode?.comment]);

  const legalTargets = useMemo<string[]>(() => {
    if (!selected) return [];
    const chess = new Chess(currentFen);
    return chess
      .moves({ square: selected as Square, verbose: true })
      .map((m) => m.to);
  }, [selected, currentFen]);

  const commitMove = useCallback(
    async (from: string, to: string) => {
      const chess = new Chess(currentFen);
      let move;
      try {
        move = chess.move({ from, to, promotion: "q" });
      } catch {
        return;
      }
      if (!move) return;
      const uci = `${move.from}${move.to}${move.promotion ?? ""}`;
      setSelected(null);
      setError(null);

      const existing = options.find((n) => n.uci === uci);
      if (existing) {
        setPath((p) => [...p, existing.id]);
        return;
      }

      setBusy(true);
      const res = await addMoveAction(repertoireId, currentId, from, to);
      setBusy(false);
      if (res.ok) {
        setNodes((prev) =>
          prev.some((n) => n.id === res.node.id) ? prev : [...prev, res.node],
        );
        setPath((p) => [...p, res.node.id]);
      } else {
        setError(res.error);
      }
    },
    [currentFen, options, currentId, repertoireId],
  );

  const onPieceDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (!targetSquare || busy) return false;
      const chess = new Chess(currentFen);
      try {
        if (!chess.move({ from: sourceSquare, to: targetSquare, promotion: "q" }))
          return false;
      } catch {
        return false;
      }
      void commitMove(sourceSquare, targetSquare);
      return true;
    },
    [busy, currentFen, commitMove],
  );

  const onSquareClick = useCallback(
    ({ piece, square }: { piece: { pieceType: string } | null; square: string }) => {
      if (busy) return;
      const isOwnPiece = !!piece && piece.pieceType[0] === turnChar;
      if (selected) {
        if (square === selected) setSelected(null);
        else if (isOwnPiece) setSelected(square);
        else void commitMove(selected, square);
        return;
      }
      if (isOwnPiece) setSelected(square);
    },
    [busy, selected, turnChar, commitMove],
  );

  const squareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const styles: Record<string, React.CSSProperties> = {};
    for (const sq of legalTargets) styles[sq] = { backgroundImage: DOT };
    if (selected) styles[selected] = { backgroundColor: SELECT };
    return styles;
  }, [legalTargets, selected]);

  async function deleteCurrent() {
    if (!currentNode) return;
    const id = currentNode.id;
    // Collect the subtree to prune locally.
    const remove = new Set<string>([id]);
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      for (const child of childrenOf.get(cur) ?? []) {
        remove.add(child.id);
        stack.push(child.id);
      }
    }
    setBusy(true);
    const res = await deleteNodeAction(repertoireId, id);
    setBusy(false);
    if (res.ok) {
      setNodes((prev) => prev.filter((n) => !remove.has(n.id)));
      setPath((p) => p.slice(0, -1));
    }
  }

  async function saveComment() {
    if (!currentNode) return;
    setBusy(true);
    await setCommentAction(repertoireId, currentNode.id, commentDraft);
    setBusy(false);
    setNodes((prev) =>
      prev.map((n) =>
        n.id === currentNode.id
          ? { ...n, comment: commentDraft.trim() || null }
          : n,
      ),
    );
  }

  const turnName = turnChar === "w" ? "White" : "Black";

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,480px)_1fr]">
      <div className="flex flex-col gap-3">
        <div className="w-full max-w-[480px]">
          <Chessboard
            options={{
              id: "repertoire-editor",
              position: currentFen,
              boardOrientation: color === "BLACK" ? "black" : "white",
              allowDragging: !busy,
              onPieceDrop,
              onSquareClick,
              squareStyles,
              animationDurationInMs: 200,
            }}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => setPath([])} disabled={path.length === 0}>
            ⏮ Start
          </Btn>
          <Btn onClick={() => setPath((p) => p.slice(0, -1))} disabled={path.length === 0}>
            ‹ Back
          </Btn>
          <Btn
            onClick={() => options[0] && setPath((p) => [...p, options[0].id])}
            disabled={options.length === 0}
          >
            Next ›
          </Btn>
          <Btn onClick={deleteCurrent} disabled={!currentNode || busy} danger>
            ✕ Delete move
          </Btn>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <p className="text-lg font-semibold">
          {turnName} to move —{" "}
          <span className="font-normal text-muted">
            play a move on the board to add it.
          </span>
        </p>

        {error && (
          <p className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        {/* Breadcrumb of the current line */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted">Line</h3>
          <div className="flex flex-wrap gap-1.5">
            {lineNodes.length === 0 && (
              <span className="text-sm text-muted">Starting position</span>
            )}
            {lineNodes.map((n, i) => (
              <button
                key={n.id}
                onClick={() => setPath((p) => p.slice(0, i + 1))}
                className={`rounded px-2 py-1 text-sm font-medium ${
                  i === lineNodes.length - 1
                    ? "bg-accent text-stone-950"
                    : "bg-card hover:bg-border"
                } ${n.isPlayerMove ? "" : "text-muted"}`}
              >
                {moveLabel(n)}
              </button>
            ))}
          </div>
        </div>

        {/* Existing continuations */}
        {options.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted">
              Continuations
            </h3>
            <div className="flex flex-wrap gap-2">
              {options.map((n) => (
                <button
                  key={n.id}
                  onClick={() => setPath((p) => [...p, n.id])}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:border-accent ${
                    n.isPlayerMove
                      ? "border-accent/50 bg-accent/10"
                      : "border-border bg-card"
                  }`}
                >
                  {moveLabel(n)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comment editor for the current move */}
        {currentNode && (
          <div>
            <h3 className="mb-2 text-sm font-semibold text-muted">
              Note on {currentNode.san}
            </h3>
            <textarea
              value={commentDraft}
              onChange={(e) => setCommentDraft(e.target.value)}
              rows={2}
              placeholder="Why this move? (optional)"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={saveComment}
              disabled={busy || commentDraft === (currentNode.comment ?? "")}
              className="mt-2 rounded-lg border border-border px-3 py-1.5 text-sm transition hover:border-accent disabled:opacity-40"
            >
              Save note
            </button>
          </div>
        )}

        <Link
          href={`/repertoires/${repertoireId}`}
          className="mt-auto text-sm text-accent hover:underline"
        >
          Done editing →
        </Link>
      </div>
    </div>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-1.5 text-sm transition disabled:opacity-40 ${
        danger
          ? "border-border text-muted hover:border-red-800 hover:text-red-300"
          : "border-border bg-card hover:border-accent"
      }`}
    >
      {children}
    </button>
  );
}
