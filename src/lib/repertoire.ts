import "server-only";
import type { Color } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parsePgnToTree, countTree, type ParsedNode } from "@/lib/pgn";

// Persist a parsed tree depth-first, linking parents and creating a Card for
// every player move. Runs inside the caller's transaction client.
async function persistNodes(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  nodes: ParsedNode[],
  repertoireId: string,
  userId: string,
  parentId: string | null,
): Promise<void> {
  for (const n of nodes) {
    const created = await tx.moveNode.create({
      data: {
        repertoireId,
        parentId,
        ply: n.ply,
        san: n.san,
        uci: n.uci,
        fenAfter: n.fenAfter,
        isPlayerMove: n.isPlayerMove,
        comment: n.comment,
        nag: n.nag,
      },
    });
    if (n.isPlayerMove) {
      await tx.card.create({
        data: { userId, moveNodeId: created.id },
      });
    }
    await persistNodes(tx, n.children, repertoireId, userId, created.id);
  }
}

/** Create a repertoire from a PGN string. Throws on invalid PGN. */
export async function createRepertoireFromPgn(
  userId: string,
  name: string,
  color: Color,
  pgn: string,
) {
  const tree = parsePgnToTree(pgn, color); // throws on illegal move / empty
  const { total } = countTree(tree);

  return prisma.$transaction(
    async (tx) => {
      const repertoire = await tx.repertoire.create({
        data: { userId, name, color },
      });
      await persistNodes(tx, tree, repertoire.id, userId, null);
      return repertoire;
    },
    { timeout: 30_000, maxWait: 10_000 },
  ).then((r) => ({ repertoire: r, moveCount: total }));
}

/** Create an empty repertoire to build by hand in the editor. */
export async function createEmptyRepertoire(
  userId: string,
  name: string,
  color: Color,
) {
  return prisma.repertoire.create({ data: { userId, name, color } });
}

const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export async function listRepertoires(userId: string) {
  const repertoires = await prisma.repertoire.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { nodes: true } } },
  });

  // A thumbnail = the main-line position a few moves in. Fetch only shallow
  // nodes (ply <= 8) so large repertoires stay cheap, then walk first-children.
  const shallow = await prisma.moveNode.findMany({
    where: { repertoireId: { in: repertoires.map((r) => r.id) }, ply: { lte: 8 } },
    orderBy: [{ ply: "asc" }, { id: "asc" }],
    select: { repertoireId: true, parentId: true, id: true, fenAfter: true },
  });

  const childrenByRep = new Map<string, Map<string, typeof shallow>>();
  for (const n of shallow) {
    const rep = childrenByRep.get(n.repertoireId) ?? new Map();
    const key = n.parentId ?? "root";
    (rep.get(key) ?? rep.set(key, []).get(key)!).push(n);
    childrenByRep.set(n.repertoireId, rep);
  }

  return repertoires.map((r) => {
    const children = childrenByRep.get(r.id);
    let fen = START_FEN;
    let cursor = "root";
    for (let depth = 0; depth < 8; depth++) {
      const next = children?.get(cursor)?.[0];
      if (!next) break;
      fen = next.fenAfter;
      cursor = next.id;
    }
    return { ...r, previewFen: fen };
  });
}

/** Load a repertoire and its full move tree (flat, ordered by depth). */
export async function getRepertoire(id: string, userId: string) {
  const repertoire = await prisma.repertoire.findFirst({
    where: { id, userId },
  });
  if (!repertoire) return null;

  const nodes = await prisma.moveNode.findMany({
    where: { repertoireId: id },
    orderBy: [{ ply: "asc" }, { id: "asc" }],
    select: {
      id: true,
      parentId: true,
      ply: true,
      san: true,
      uci: true,
      fenAfter: true,
      isPlayerMove: true,
      comment: true,
      nag: true,
    },
  });
  return { repertoire, nodes };
}

export async function deleteRepertoire(id: string, userId: string) {
  // Cascades to nodes, cards, and review logs (see schema).
  await prisma.repertoire.deleteMany({ where: { id, userId } });
}
