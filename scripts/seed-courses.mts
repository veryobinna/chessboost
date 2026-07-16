// Seed the first-party course library. Idempotent: re-running replaces each
// course (matched by slug) with the latest content. Personal copies cloned by
// users are never touched.
//
// Usage:
//   node scripts/seed-courses.mts                      # local .env DB
//   DATABASE_URL=... DIRECT_URL=... node scripts/seed-courses.mts   # prod
//
// All PGNs are validated move-by-move (chess.js throws on any illegal move)
// before anything is persisted.

import { PrismaClient } from "@prisma/client";
import { parsePgnToTree, countTree, type ParsedNode } from "../src/lib/pgn.ts";

const prisma = new PrismaClient();

type CourseSpec = {
  slug: string;
  name: string;
  color: "WHITE" | "BLACK";
  category: string;
  description: string;
  intro: string;
  article: string;
  pgn: string;
};

const COURSES: CourseSpec[] = [
  {
    slug: "ponziani-main",
    name: "Ponziani Opening",
    color: "WHITE",
    category: "Classical",
    description:
      "An old, underrated weapon. 3.c3 quietly prepares a big centre — and most opponents have no idea how to punish it.",
    intro:
      "Meet the Ponziani — an aggressive way to fight for the centre after 1.e4 e5 2.Nf3 Nc6 3.c3. Follow the highlighted move to begin.",
    article: `The Ponziani Opening (1.e4 e5 2.Nf3 Nc6 3.c3) is one of the oldest recorded chess openings — it appears in literature well before it was named after the 18th-century Italian theoretician Domenico Lorenzo Ponziani.

The idea is simple and ambitious: White prepares d2–d4 to build a broad pawn centre. The cost is that c3 takes the natural square of the b1-knight, and Black can strike back immediately in the centre.

Because it is rare at club level, opponents often reply with natural-looking moves that run into concrete problems. This course covers Black's four main tries — 3...Nf6, 3...d5, 3...d6 and 3...f5 — and gives you a clear plan against each.`,
    pgn: `1. e4 e5 2. Nf3 Nc6 3. c3 {The Ponziani: White prepares d2-d4 to build a broad pawn centre. The small cost is that c3 takes the b1-knight's natural square.}
3... Nf6 {The most testing reply, immediately hitting e4.}
( 3... d5 {The Ponziani Counter-attack, Black's most principled try.} 4. Qa4 {The key move: it pins the c6-knight along the a4-e8 diagonal, so that ...dxe4 can be met by Nxe5.}
  4... f6 {Solidly defending e5.}
  ( 4... Nf6 5. Nxe5 {Winning the e5-pawn, because the pinned knight on c6 cannot recapture.} 5... Bd6 6. Nxc6 bxc6 7. d3 {White is simply a healthy pawn up.} )
  5. Bb5 {Increasing the pressure on the pinned knight.} 5... Nge7 6. exd5 Qxd5 7. d4 {with a pleasant, slightly freer game for White.} )
( 3... d6 {Passive but solid.} 4. d4 Nf6 5. Bd3 {A harmonious set-up; the bishop also defends e4.} )
( 3... f5 {The sharp Ponziani Gambit.} 4. d4 {Striking in the centre before Black is ready.} )
4. d4 {The thematic central break.} 4... exd4
( 4... Nxe4 $2 {Too greedy.} 5. d5 {The refutation: the c6-knight is attacked and the e4-knight will be left stranded.} 5... Ne7 6. Nxe5 {White regains the pawn with a clear advantage.} )
5. e5 {Gaining space and chasing the f6-knight.} 5... Nd5 6. cxd4 {White has the ideal big centre with pawns on d4 and e5.} 6... d6 7. Bc4 {Developing with tempo against the d5-knight.} 7... Nb6 8. Bb3 {White is comfortably better developed.}`,
  },
  {
    slug: "ponziani-traps",
    name: "Ponziani — Traps & Tricks",
    color: "WHITE",
    category: "Trap-heavy",
    description:
      "The Ponziani looks harmless. It isn't. Learn the traps that punish Black's most natural replies.",
    intro:
      "The Ponziani looks quiet, but it is full of traps. Watch how natural-looking replies can go badly wrong for Black.",
    article: `Trappy openings work because they punish *natural* moves. The Ponziani is full of them: Black's most human replies — developing a knight, grabbing a centre pawn — can lose material by force.

This course isolates the tactical core of the opening. You'll learn the Qa4 pin that wins the e5-pawn, why grabbing on e4 loses a piece to d5, and the one defensive resource (…Bd7) you must know how to meet correctly.`,
    pgn: `1. e4 e5 2. Nf3 Nc6 3. c3 {The Ponziani looks harmless, but it sets traps if Black reacts naturally.}
3... d5 {The most common - and most dangerous - reply to meet.}
( 3... Nf6 4. d4 Nxe4 $2 {Grabbing the centre pawn is a classic mistake here.} 5. d5 {The c6-knight is hit and the e4-knight is suddenly stranded.} 5... Ne7 6. Nxe5 {White wins back the pawn and stands clearly better.} )
4. Qa4 {The trick: Qa4 pins the c6-knight to the king, so the e5-pawn is suddenly hanging.}
4... Nf6 $2 {Natural development that walks straight into it.}
( 4... f6 {The correct, careful defence of e5.} 5. Bb5 {White keeps a small pull.} )
( 4... Bd7 {Unpinning - best. But there is a trick for both sides:} 5. exd5 Nd4 {Hitting f3 and threatening ...Nxc2+.} 6. Qd1 {The cool reply. Note that 6.Nxe5 Nxc2+ would fork king and rook!} 6... Nxf3+ 7. Qxf3 {White stays a clean pawn up.} )
5. Nxe5 {Collecting the pawn: the pinned c6-knight cannot take back.} 5... Bd6 6. Nxc6 bxc6 7. d3 {White has won a pawn for nothing.}`,
  },
  {
    slug: "italian-game",
    name: "Italian Game",
    color: "WHITE",
    category: "Classical",
    description:
      "The classical way to open a chess game: fast development, a safe king, and long-term pressure on f7.",
    intro:
      "The Italian Game is chess development done right: knight out, bishop to its best diagonal, castle. Start with e4.",
    article: `The Italian Game (1.e4 e5 2.Nf3 Nc6 3.Bc4) is one of the oldest openings in chess — it was analysed by Italian masters like Greco in the 17th century, which is where it gets its name.

The bishop on c4 aims at f7, the weakest square in Black's camp. Modern practice favours the quiet build-up (the "Giuoco Pianissimo"): support the centre with c3 and d3, castle, and only then expand.

This is an ideal first repertoire: every move follows a principle you can reuse in any opening — develop quickly, control the centre, keep your king safe.`,
    pgn: `1. e4 e5 2. Nf3 Nc6 3. Bc4 {The Italian bishop eyes f7, Black's weakest point.}
3... Bc5 {The classical Giuoco Piano.}
( 3... Nf6 {The Two Knights Defence.} 4. d3 {A solid, modern choice, avoiding early complications.} 4... Be7 5. O-O O-O 6. Re1 d6 7. c3 {with a comfortable, flexible position.} )
4. c3 {Preparing d4 while keeping the option of a slow build-up.} 4... Nf6 5. d3 {The modern Giuoco Pianissimo: White builds calmly.} 5... d6 6. O-O O-O 7. Re1 a6 8. Bb3 {Tucking the bishop away from ...Na5 or ...b5 tricks.} 8... Ba7 9. h3 {A useful move: it stops ...Bg4 and prepares a later Nbd2-f1-g3 plan.}`,
  },
  {
    slug: "vienna-game",
    name: "Vienna Game",
    color: "WHITE",
    category: "Gambit",
    description:
      "Looks like a quiet 2.Nc3 — then f4 hits the board. Sharp play, early attacks, and a famous queen trap.",
    intro:
      "The Vienna starts quietly with 2.Nc3, but White's real plan is an early f4 — a King's Gambit on better terms. Play e4 to begin.",
    article: `The Vienna Game (1.e4 e5 2.Nc3) was a favourite of the 19th-century Vienna school of chess. The modest knight move hides an aggressive idea: White often follows with f4, getting King's Gambit-style attacks while keeping the option to develop calmly.

The critical test is the Vienna Gambit (2...Nf6 3.f4). If Black takes the pawn, e5 kicks the f6-knight and White gets a big lead in development. The correct reply, 3...d5, leads to lively play where knowing the ideas matters more than memorising moves.

This course also covers the famous Qg4 attack against 2...Nc6 3.Bc4 Bc5 — including the trap that has caught thousands of players who grabbed the f2-pawn.`,
    pgn: `1. e4 e5 2. Nc3 {The Vienna: flexible development that often hides an early f4.}
2... Nf6
( 2... Nc6 3. Bc4 Bc5 4. Qg4 {The Vienna's sting: the queen hits g7 immediately.}
  4... Qf6 {Defending g7 while keeping an eye on f2.}
  ( 4... g6 5. Qf3 {Switching targets to f7.} 5... Nf6 6. Nge2 {with a comfortable attacking setup.} )
  5. Nd5 {Hitting both the queen and c7.} 5... Qxf2+ $4 {Greedy - and losing.} 6. Kd1 Kf8 7. Nh3 {The f2-queen is nearly trapped: Rf1 and d3 are coming, and Nxc7 still hangs over Black.} )
3. f4 {The Vienna Gambit - a King's Gambit with the knight already developed.}
3... d5 {The correct, central counter.}
( 3... exf4 $2 {Taking is exactly what White wants here.} 4. e5 {The point: the f6-knight is pushed away, unlike in a normal King's Gambit.} 4... Ng8 5. Nf3 d6 6. d4 {White dominates the centre with a big lead in development.} )
4. fxe5 Nxe4 5. Nf3 {Calm development; the e4-knight will be questioned soon.} 5... Be7 6. d4 O-O 7. Bd3 f5 8. exf6 {Taking en passant keeps the initiative.} 8... Bxf6 9. O-O {White has the safer king and the better centre.}`,
  },
  {
    slug: "scandinavian-defense",
    name: "Scandinavian Defense",
    color: "BLACK",
    category: "Solid",
    description:
      "Answer 1.e4 with an immediate strike: 1...d5. One clear system, easy to learn, hard to attack.",
    intro:
      "The Scandinavian meets 1.e4 head-on: you strike the centre on move one and follow a clear, repeatable plan. When White plays e4, answer d5.",
    article: `The Scandinavian Defense (1.e4 d5) has a claim no other opening can make: it appears in the oldest recorded game of modern chess, played in Valencia around 1475.

The appeal is practical. Black forces the pace from move one: after 2.exd5 Qxd5 3.Nc3 Qa5 you reach *your* structure almost every game, while White's mountain of 1.e4 theory is useless.

Your plan is nearly always the same: ...c6 to give the queen a retreat, ...Nf6 and ...Bf5 to develop actively, then ...e6 and long-term solidity. This course teaches the main line and the key move-order tricks.`,
    pgn: `1. e4 d5 {The Scandinavian: challenge the centre immediately.} 2. exd5 Qxd5 {Yes, the queen comes out early - but White can only gain one tempo on it.}
3. Nc3 {The main move, hitting the queen.}
( 3. Nf3 {A quieter try.} 3... Bg4 {Active development, pinning the knight.} 4. Be2 Nc6 {with easy, natural play for Black.} )
3... Qa5 {The classical retreat: the queen stays active and eyes the e5-square and a5-e1 diagonal.}
4. d4 Nf6 5. Nf3 c6 {The key move of the whole system: the queen gets the c7 retreat and the b5-square is covered.}
6. Bc4 Bf5 {The bishop develops outside the pawn chain before ...e6 closes it in.}
7. Bd2 e6 8. Qe2 Bb4 {Pressuring c3 and preparing to castle - Black's development is complete and harmonious.}`,
  },
  {
    slug: "london-system",
    name: "London System",
    color: "WHITE",
    category: "System",
    description:
      "The same solid setup against almost anything Black plays. Low theory, high annoyance factor.",
    intro:
      "The London System is a setup, not a memorised sequence: d4, Bf4, e3, Nf3, Bd3, c3. Start with d4 and build the wall.",
    article: `The London System (1.d4 with an early Bf4) is the definitive "system" opening: White develops the same pieces to the same squares against almost anything Black does.

Long considered too quiet for top chess, it was revived at the highest level — world champions have used it as a surprise weapon precisely because it is so hard to unbalance.

The setup to remember: d4, Bf4 (the bishop gets out *before* e3 closes it in), e3, Nf3, Bd3, c3, and usually Nbd2. This course walks the standard setup and the one critical exception: how to react when Black hits the centre early with ...c5.`,
    pgn: `1. d4 d5 2. Bf4 {The London move: the bishop develops outside the pawn chain first.}
2... Nf6
( 2... c5 {The most critical try: hitting d4 before White is set up.} 3. e3 Nc6 4. Nf3 cxd4 5. exd4 Nf6 6. c3 {The centre is rock solid; White continues Bd3 and O-O as usual.} )
3. e3 e6 4. Nf3 Bd6 {Black offers a trade of the good bishop.}
5. Bg3 {The standard reaction: keep the bishop and let Black take on g3 if they want, opening the h-file for the rook.}
5... O-O 6. Bd3 c5 7. c3 {The famous London pyramid: pawns on c3, d4, e3.} 7... Nc6 8. Nbd2 {Completing the setup - every London game looks like this.}`,
  },
];

async function persist(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  nodes: ParsedNode[],
  repertoireId: string,
  parentId: string | null,
) {
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
    await persist(tx, n.children, repertoireId, created.id);
  }
}

// 1) Validate everything first — nothing is written if any PGN is bad.
const parsed = COURSES.map((c) => {
  const tree = parsePgnToTree(c.pgn, c.color);
  const counts = countTree(tree);
  console.log(`VALIDATED ${c.slug}: ${counts.total} nodes, ${counts.playerMoves} player moves`);
  return { spec: c, tree };
});

// 2) Ensure the system author exists.
const system = await prisma.user.upsert({
  where: { email: "courses@chessboost.app" },
  update: { isAdmin: true },
  create: {
    email: "courses@chessboost.app",
    name: "ChessBoost",
    isGuest: false,
    isAdmin: true,
  },
});

// 3) Replace each course by slug (cloned personal copies are untouched).
for (const { spec, tree } of parsed) {
  await prisma.repertoire.deleteMany({ where: { slug: spec.slug } });
  const rep = await prisma.$transaction(
    async (tx) => {
      const r = await tx.repertoire.create({
        data: {
          userId: system.id,
          name: spec.name,
          color: spec.color,
          slug: spec.slug,
          isPublished: true,
          category: spec.category,
          description: spec.description,
          intro: spec.intro,
          article: spec.article,
        },
      });
      await persist(tx, tree, r.id, null);
      return r;
    },
    { timeout: 60_000 },
  );
  const n = await prisma.moveNode.count({ where: { repertoireId: rep.id } });
  console.log(`SEEDED ${spec.slug} (${n} nodes)`);
}

const total = await prisma.repertoire.count({ where: { isPublished: true } });
console.log(`DONE — ${total} published courses.`);
await prisma.$disconnect();
