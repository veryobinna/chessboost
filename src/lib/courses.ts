import "server-only";
import { prisma } from "@/lib/prisma";

const START_FEN =
  "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/** Published courses for the catalog, grouped by color, with a preview FEN. */
export async function listCourses() {
  const courses = await prisma.repertoire.findMany({
    where: { isPublished: true },
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { nodes: true } } },
  });

  const shallow = await prisma.moveNode.findMany({
    where: { repertoireId: { in: courses.map((c) => c.id) }, ply: { lte: 8 } },
    orderBy: [{ ply: "asc" }, { id: "asc" }],
    select: { repertoireId: true, parentId: true, id: true, fenAfter: true },
  });
  const byRep = new Map<string, Map<string, typeof shallow>>();
  for (const n of shallow) {
    const rep = byRep.get(n.repertoireId) ?? new Map();
    const key = n.parentId ?? "root";
    (rep.get(key) ?? rep.set(key, []).get(key)!).push(n);
    byRep.set(n.repertoireId, rep);
  }

  return courses.map((c) => {
    const children = byRep.get(c.id);
    let fen = START_FEN;
    let cursor = "root";
    for (let d = 0; d < 8; d++) {
      const next = children?.get(cursor)?.[0];
      if (!next) break;
      fen = next.fenAfter;
      cursor = next.id;
    }
    return { ...c, previewFen: fen };
  });
}

/** A published course + its move tree — public, no ownership required. */
export async function getCourse(id: string) {
  const course = await prisma.repertoire.findFirst({
    where: { id, isPublished: true },
  });
  if (!course) return null;

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
  return { course, nodes };
}

/**
 * Clone a published course into a user's repertoires (deep copy of the tree,
 * plus a Card per player move). Uses precomputed ids + createMany so large
 * courses clone in a handful of queries instead of one insert per node.
 */
export async function cloneCourse(courseId: string, userId: string) {
  const data = await getCourse(courseId);
  if (!data) return null;
  const { course, nodes } = data;

  // If the user already has a copy of this course, return it instead.
  const existing = await prisma.repertoire.findFirst({
    where: { userId, sourceId: courseId },
    select: { id: true },
  });
  if (existing) return { id: existing.id, already: true };

  const idMap = new Map<string, string>(
    nodes.map((n) => [n.id, crypto.randomUUID()]),
  );

  const copy = await prisma.$transaction(async (tx) => {
    const rep = await tx.repertoire.create({
      data: {
        userId,
        name: course.name,
        color: course.color,
        intro: course.intro,
        article: course.article,
        description: course.description,
        category: course.category,
        sourceId: course.id,
      },
    });
    await tx.moveNode.createMany({
      data: nodes.map((n) => ({
        id: idMap.get(n.id)!,
        repertoireId: rep.id,
        parentId: n.parentId ? idMap.get(n.parentId)! : null,
        ply: n.ply,
        san: n.san,
        uci: n.uci,
        fenAfter: n.fenAfter,
        isPlayerMove: n.isPlayerMove,
        comment: n.comment,
        nag: n.nag,
      })),
    });
    await tx.card.createMany({
      data: nodes
        .filter((n) => n.isPlayerMove)
        .map((n) => ({ userId, moveNodeId: idMap.get(n.id)! })),
    });
    return rep;
  }, { timeout: 30_000 });

  return { id: copy.id, already: false };
}
