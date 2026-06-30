import { Chess } from "chess.js";
import { parseGame } from "@mliebelt/pgn-parser";
import type { Color } from "@prisma/client";

// A parsed repertoire move tree (pre-persistence). Each node is one move plus
// the position it leads to; `children` are the moves that can follow.
export type ParsedNode = {
  san: string;
  uci: string;
  fenAfter: string;
  ply: number;
  isPlayerMove: boolean;
  comment?: string;
  nag?: number;
  children: ParsedNode[];
};

const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Minimal shape of a @mliebelt/pgn-parser move we rely on.
type PgnMove = {
  notation: { notation: string };
  variations?: PgnMove[][];
  nag?: string[] | null;
  commentAfter?: string;
};

function colorChar(color: Color): "w" | "b" {
  return color === "WHITE" ? "w" : "b";
}

function firstNag(nag?: string[] | null): number | undefined {
  if (!nag || nag.length === 0) return undefined;
  const n = parseInt(nag[0].replace(/^\$/, ""), 10);
  return Number.isNaN(n) ? undefined : n;
}

function makeNode(
  mv: PgnMove,
  fromFen: string,
  ply: number,
  color: Color,
): ParsedNode {
  const chess = new Chess(fromFen);
  // chess.js v1 throws on an illegal/unparseable move.
  const m = chess.move(mv.notation.notation);
  return {
    san: m.san,
    uci: `${m.from}${m.to}${m.promotion ?? ""}`,
    fenAfter: chess.fen(),
    ply,
    isPlayerMove: m.color === colorChar(color),
    comment: mv.commentAfter?.trim() || undefined,
    nag: firstNag(mv.nag),
    children: [],
  };
}

// Attach one line of moves to `siblings`. A move's `variations` are alternatives
// at the same position (so they become siblings), while the rest of the line is
// the continuation (so it becomes that move's children). See DESIGN.md §12.
function attachLine(
  moves: PgnMove[],
  siblings: ParsedNode[],
  fromFen: string,
  ply: number,
  color: Color,
): void {
  if (moves.length === 0) return;
  const [head, ...rest] = moves;

  const node = makeNode(head, fromFen, ply, color);
  siblings.push(node);

  // Alternatives to `head` at the same position → siblings of `node`.
  for (const variation of head.variations ?? []) {
    attachLine(variation, siblings, fromFen, ply, color);
  }

  // The continuation after `head` → children of `node`.
  attachLine(rest, node.children, node.fenAfter, ply + 1, color);
}

/**
 * Parse a PGN (with variations) into a repertoire move tree.
 * Throws if the PGN is empty or contains an illegal move.
 */
export function parsePgnToTree(pgn: string, color: Color): ParsedNode[] {
  const game = parseGame(pgn.trim());
  const moves = (game?.moves ?? []) as PgnMove[];
  if (moves.length === 0) {
    throw new Error("No moves found in PGN.");
  }
  const roots: ParsedNode[] = [];
  attachLine(moves, roots, START_FEN, 1, color);
  return roots;
}

/** Count nodes and player-move (card) nodes in a parsed tree. */
export function countTree(nodes: ParsedNode[]): {
  total: number;
  playerMoves: number;
} {
  let total = 0;
  let playerMoves = 0;
  const walk = (ns: ParsedNode[]) => {
    for (const n of ns) {
      total++;
      if (n.isPlayerMove) playerMoves++;
      walk(n.children);
    }
  };
  walk(nodes);
  return { total, playerMoves };
}
