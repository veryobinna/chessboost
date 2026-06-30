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

export async function listRepertoires(userId: string) {
  return prisma.repertoire.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { nodes: true } } },
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
