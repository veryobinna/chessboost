import { Chess } from "chess.js";
import { parseGames } from "@mliebelt/pgn-parser";
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

  // Merge: if this move already exists at this position (same line reached via
  // another chapter/variation), reuse that node instead of duplicating it.
  let target = siblings.find((s) => s.uci === node.uci);
  if (target) {
    if (!target.comment && node.comment) target.comment = node.comment;
    if (target.nag == null && node.nag != null) target.nag = node.nag;
  } else {
    siblings.push(node);
    target = node;
  }

  // Alternatives to `head` at the same position → siblings of `target`.
  for (const variation of head.variations ?? []) {
    attachLine(variation, siblings, fromFen, ply, color);
  }

  // The continuation after `head` → children of `target`.
  attachLine(rest, target.children, target.fenAfter, ply + 1, color);
}

type PgnGame = { tags?: unknown; moves?: PgnMove[] };

/**
 * Parse a PGN into a repertoire move tree. Handles multiple games/chapters
 * (e.g. a Lichess study export) by merging them into one forest.
 * Throws if the PGN is empty, starts from a custom position, or is illegal.
 */
export function parsePgnToTree(pgn: string, color: Color): ParsedNode[] {
  const games = parseGames(pgn.trim()) as PgnGame[];
  const roots: ParsedNode[] = [];

  for (const game of games) {
    const moves = (game?.moves ?? []) as PgnMove[];
    if (moves.length === 0) continue;

    const tags = game?.tags as Record<string, unknown> | undefined;
    const fen = typeof tags?.FEN === "string" ? tags.FEN : undefined;
    if (fen && fen !== START_FEN) {
      throw new Error(
        "PGNs/studies that start from a custom position aren't supported yet.",
      );
    }

    attachLine(moves, roots, START_FEN, 1, color);
  }

  if (roots.length === 0) {
    throw new Error("No moves found in PGN.");
  }
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
