"use server";

import { revalidatePath } from "next/cache";
import { Chess } from "chess.js";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { START_FEN } from "@/lib/drill";

export type EditorNode = {
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

type AddResult =
  | { ok: true; node: EditorNode; created: boolean }
  | { ok: false; error: string };

// Confirm the repertoire belongs to the signed-in (guest) user.
async function ownedRepertoire(repertoireId: string) {
  const user = await getCurrentUser();
  if (!user) return null;
  const repertoire = await prisma.repertoire.findFirst({
    where: { id: repertoireId, userId: user.id },
  });
  return repertoire ? { user, repertoire } : null;
}

/** Add a move under `parentId` (or at the root when null). Idempotent: if the
 * move already exists at that position, the existing node is returned. */
export async function addMoveAction(
  repertoireId: string,
  parentId: string | null,
  from: string,
  to: string,
  promotion?: string,
): Promise<AddResult> {
  const owned = await ownedRepertoire(repertoireId);
  if (!owned) return { ok: false, error: "Not found." };
  const { user, repertoire } = owned;

  let fromFen = START_FEN;
  let ply = 1;
  if (parentId) {
    const parent = await prisma.moveNode.findFirst({
      where: { id: parentId, repertoireId },
    });
    if (!parent) return { ok: false, error: "Parent move not found." };
    fromFen = parent.fenAfter;
    ply = parent.ply + 1;
  }

  const chess = new Chess(fromFen);
  let move;
  try {
    move = chess.move({ from, to, promotion: promotion ?? "q" });
  } catch {
    return { ok: false, error: "Illegal move." };
  }
  if (!move) return { ok: false, error: "Illegal move." };

  const uci = `${move.from}${move.to}${move.promotion ?? ""}`;

  const existing = await prisma.moveNode.findFirst({
    where: { repertoireId, parentId, uci },
  });
  if (existing) return { ok: true, node: existing, created: false };

  const isPlayerMove = move.color === (repertoire.color === "WHITE" ? "w" : "b");
  const node = await prisma.moveNode.create({
    data: {
      repertoireId,
      parentId,
      ply,
      san: move.san,
      uci,
      fenAfter: chess.fen(),
      isPlayerMove,
    },
  });
  if (isPlayerMove) {
    await prisma.card.create({ data: { userId: user.id, moveNodeId: node.id } });
  }

  revalidatePath(`/repertoires/${repertoireId}`);
  return { ok: true, node, created: true };
}

/** Delete a node and its whole subtree (cascade). */
export async function deleteNodeAction(
  repertoireId: string,
  nodeId: string,
): Promise<{ ok: boolean }> {
  const owned = await ownedRepertoire(repertoireId);
  if (!owned) return { ok: false };

  await prisma.moveNode.deleteMany({ where: { id: nodeId, repertoireId } });
  revalidatePath(`/repertoires/${repertoireId}`);
  return { ok: true };
}

/** Set or clear the comment on a node. */
export async function setCommentAction(
  repertoireId: string,
  nodeId: string,
  comment: string,
): Promise<{ ok: boolean }> {
  const owned = await ownedRepertoire(repertoireId);
  if (!owned) return { ok: false };

  const trimmed = comment.trim();
  await prisma.moveNode.updateMany({
    where: { id: nodeId, repertoireId },
    data: { comment: trimmed || null },
  });
  revalidatePath(`/repertoires/${repertoireId}`);
  return { ok: true };
}

/** Set or clear a move's evaluation glyph (NAG). 0 clears it. */
export async function setEvalAction(
  repertoireId: string,
  nodeId: string,
  nag: number,
): Promise<{ ok: boolean }> {
  const owned = await ownedRepertoire(repertoireId);
  if (!owned) return { ok: false };

  await prisma.moveNode.updateMany({
    where: { id: nodeId, repertoireId },
    data: { nag: nag > 0 ? nag : null },
  });
  revalidatePath(`/repertoires/${repertoireId}`);
  return { ok: true };
}

/** Update the lesson hook (intro) and the optional article. */
export async function updateLessonAction(
  repertoireId: string,
  intro: string,
  article: string,
): Promise<{ ok: boolean }> {
  const owned = await ownedRepertoire(repertoireId);
  if (!owned) return { ok: false };

  await prisma.repertoire.update({
    where: { id: repertoireId },
    data: {
      intro: intro.trim() || null,
      article: article.trim() || null,
    },
  });
  revalidatePath(`/repertoires/${repertoireId}`);
  return { ok: true };
}
