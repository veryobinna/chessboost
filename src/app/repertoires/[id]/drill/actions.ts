"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export type DrillResult = { moveNodeId: string; correct: boolean };

// Persist a finished drill session: record one ReviewLog per attempt and bump
// each card's counters. No scheduling happens yet (Phase 4) — we just capture
// honest review history that the stats page and FSRS will later build on.
export async function recordDrillSession(
  repertoireId: string,
  results: DrillResult[],
): Promise<{ ok: boolean }> {
  const user = await getCurrentUser();
  if (!user || results.length === 0) return { ok: false };

  const ids = results.map((r) => r.moveNodeId);
  const cards = await prisma.card.findMany({
    where: {
      userId: user.id,
      moveNodeId: { in: ids },
      moveNode: { repertoireId },
    },
  });
  const cardByNode = new Map(cards.map((c) => [c.moveNodeId, c]));
  const now = new Date();

  await prisma.$transaction(
    results.flatMap((r) => {
      const card = cardByNode.get(r.moveNodeId);
      if (!card) return [];
      return [
        prisma.reviewLog.create({
          data: {
            cardId: card.id,
            rating: r.correct ? "GOOD" : "AGAIN",
            state: card.state,
            due: card.due,
            stability: card.stability,
            difficulty: card.difficulty,
            elapsedDays: 0,
            scheduledDays: 0,
            reviewedAt: now,
          },
        }),
        prisma.card.update({
          where: { id: card.id },
          data: {
            reps: { increment: 1 },
            lapses: { increment: r.correct ? 0 : 1 },
            lastReview: now,
          },
        }),
      ];
    }),
  );

  revalidatePath(`/repertoires/${repertoireId}`);
  revalidatePath("/dashboard");
  return { ok: true };
}
