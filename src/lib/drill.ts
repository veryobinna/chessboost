// The drill engine: turn a repertoire move tree into a queue of "what do you
// play here?" cards. The engine is decoupled from scheduling — which cards are
// eligible is decided by the optional `eligible` set (the selector seam from
// DESIGN.md §6). Phase 2 passes no set, so every player move is drilled; Phase 4
// will pass the set of due card ids.

export const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Minimal node shape the engine needs (matches the viewer node selection).
export type DrillTreeNode = {
  id: string;
  parentId: string | null;
  ply: number;
  san: string;
  uci: string;
  fenAfter: string;
  isPlayerMove: boolean;
};

export type DrillCard = {
  moveNodeId: string;
  ply: number;
  questionFen: string; // position shown to the player
  expectedUci: string;
  expectedSan: string;
  // Moves leading up to the question, for context display.
  context: { san: string; ply: number }[];
  // The opponent's last move, to highlight ("they just played …").
  lastOpponentMove?: { from: string; to: string };
};

/**
 * Build the ordered drill queue. Cards are emitted in depth-first order so that
 * moves along the same line stay together.
 */
export function buildDrillQueue(
  nodes: DrillTreeNode[],
  eligible?: Set<string>,
): DrillCard[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const childrenOf = new Map<string, DrillTreeNode[]>();
  for (const n of nodes) {
    const key = n.parentId ?? "root";
    const list = childrenOf.get(key) ?? [];
    list.push(n);
    childrenOf.set(key, list);
  }

  const ancestors = (node: DrillTreeNode): { san: string; ply: number }[] => {
    const chain: { san: string; ply: number }[] = [];
    let cur = node.parentId ? byId.get(node.parentId) : undefined;
    while (cur) {
      chain.push({ san: cur.san, ply: cur.ply });
      cur = cur.parentId ? byId.get(cur.parentId) : undefined;
    }
    return chain.reverse();
  };

  const queue: DrillCard[] = [];
  const visit = (node: DrillTreeNode) => {
    if (node.isPlayerMove && (!eligible || eligible.has(node.id))) {
      const parent = node.parentId ? byId.get(node.parentId) : null;
      const lastOpponentMove =
        parent && !parent.isPlayerMove
          ? { from: parent.uci.slice(0, 2), to: parent.uci.slice(2, 4) }
          : undefined;
      queue.push({
        moveNodeId: node.id,
        ply: node.ply,
        questionFen: parent ? parent.fenAfter : START_FEN,
        expectedUci: node.uci,
        expectedSan: node.san,
        context: ancestors(node),
        lastOpponentMove,
      });
    }
    for (const child of childrenOf.get(node.id) ?? []) visit(child);
  };

  for (const root of childrenOf.get("root") ?? []) visit(root);
  return queue;
}
