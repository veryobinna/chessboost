# ChessBoost — Design Document

A chess **opening repertoire trainer** with **spaced repetition**. Build and maintain
your opening lines, then drill them so the right moves stick. Inspired by chessreps.com.

> Status: design / pre-implementation. Portfolio project under `AILabs/`.

---

## 1. Product summary

**Problem:** Players learn opening lines but forget them between games. Reviewing a
whole opening book is inefficient.

**Solution:** Treat each "your move" in your repertoire as a flashcard. Use a spaced
repetition scheduler (FSRS) to surface only the moves you're about to forget. Drill by
playing your moves on a real board while the app plays the opponent's replies from your
repertoire.

**Core loop:** Build repertoire → cards generated for each of your moves → drill the
due queue → grade by recall → scheduler sets next due date.

---

## 2. Domain model — the key idea

A **repertoire is a tree of positions/moves** for one color.

```
                (start position)
                      │
   White move ──► [1. e4]            ← YOUR move  (1 card)
                      │
   Black replies ─► c5, e5, e6 ...   ← OPPONENT moves (branches; app plays these)
                      │   │
   Your reply ──► [2. Nf3] ...       ← YOUR move  (1 card each)
```

- A **node** = a move plus the resulting position (FEN). Edges form the tree.
- **Your-move nodes** become **spaced-repetition cards** — the "question" is the parent
  position, the "answer" is your move.
- **Opponent-move nodes** are branches the app plays automatically while drilling. You
  don't get cards for them, but you DO need a card for *each of your replies* to each
  opponent branch.
- The same player can have **multiple repertoires** (e.g. "White e4", "Black Sicilian").

### Why a tree (not a flat move list)
Openings branch: against the Sicilian you answer 2...d6, 2...Nc6 and 2...e6
differently. The tree captures every opponent deviation and your prepared response.

### Transpositions (note for later)
Different move orders can reach the same FEN. v1 keeps the tree simple (duplicates
allowed). A later pass can dedupe cards by FEN so you don't drill the same decision
twice. Tracked as future work, not MVP.

---

## 3. Data model (Postgres via Prisma)

```
User            ← Auth.js (NextAuth) standard tables: User/Account/Session/VerificationToken
  id, name, email, image, createdAt

Repertoire
  id, userId → User
  name            "White e4 main"
  color           WHITE | BLACK          (which side you train)
  startFen        default = standard start
  createdAt, updatedAt

MoveNode          (the tree)
  id, repertoireId → Repertoire
  parentId        → MoveNode (null = root child)
  ply             integer (half-move depth)
  san             "Nf3"
  uci             "g1f3"
  fenAfter        FEN after this move
  isPlayerMove    boolean   (true = generates a card)
  comment         text? (annotation, e.g. "main line")
  nag             smallint? (chess annotation glyph: !, ?, !!, etc.)

Card              (SRS state — one per player MoveNode per user)
  id, userId → User
  moveNodeId → MoveNode (unique with userId)
  due             timestamptz
  stability       float
  difficulty      float
  state           NEW | LEARNING | REVIEW | RELEARNING
  reps, lapses    int
  lastReview      timestamptz?

ReviewLog          (history — powers stats + FSRS optimization)
  id, cardId → Card
  rating          AGAIN | HARD | GOOD | EASY
  state           card state at review time
  due, stability, difficulty, elapsedDays, scheduledDays
  reviewedAt
```

Indexes: `Card(userId, due)` for the due-queue query; `MoveNode(repertoireId, parentId)`
for tree traversal.

---

## 4. Tech stack

| Concern        | Choice                                   | Why |
|----------------|------------------------------------------|-----|
| Framework      | **Next.js (App Router) + TypeScript**    | One codebase, server actions, easy Vercel deploy |
| UI             | **Tailwind + shadcn/ui**                 | Fast, clean, accessible components |
| Chess board    | **react-chessboard**                     | Drag-and-drop board, well maintained |
| Chess rules    | **chess.js**                             | Move legality, SAN/FEN, PGN parsing |
| Spaced rep.    | **ts-fsrs** (deferred to Phase 4)        | Modern FSRS scheduler; layered on later |
| ORM / DB       | **Prisma + Postgres (Neon)**             | Type-safe queries, serverless Postgres |
| Auth           | **Guest sessions first** (cookie → guest User); Auth.js OAuth later | No signup friction for visitors; real accounts added in Phase 4 |
| Data fetching  | Server Components + Server Actions; TanStack Query for drill UI | minimal API surface |
| Deploy         | **Vercel** (app) + **Neon** (db)         | Free tier, custom domain, near-zero ops |
| Tooling        | Node 20 (nvm), pnpm, ESLint, Prettier, Vitest | — |

---

## 5. App structure (routes)

```
/                     Landing page (what it is, CTA)
/login                Auth.js sign-in
/dashboard            Due-today count, streak, repertoire list, "Start drilling"
/repertoires          List + create
/repertoires/[id]     Repertoire viewer/editor (board + move tree)
/repertoires/[id]/import   PGN paste / file / Lichess study URL
/drill                Drill the global due queue (all repertoires)
/drill/[repertoireId] Drill one repertoire
/stats                Review history, accuracy by opening, calendar heatmap
/settings             Board theme, scheduler params, account
/api/...              Route handlers where actions aren't enough
```

---

## 6. Drill engine (the heart of the app)

The drill engine and the **scheduler** are deliberately separated. The engine walks the
tree and quizzes you; a pluggable **selector** decides *which* cards are eligible.

- **Phase 2 selector (no scheduling):** "drill the whole repertoire" or "drill one line"
  — every player move is eligible, ordered by line then by least-recently-correct.
- **Phase 4 selector (spaced repetition):** only cards with `due <= now`, ordered by due.
  Same engine, different `getEligibleCards()`. This keeps the hard chess logic stable
  while we add FSRS later.

**Traversal loop:**
1. Start at the repertoire root. The app **auto-plays opponent moves** down the line.
2. When it reaches a **player-move** node that's eligible, **stop and quiz the user**.
3. User drags a piece:
   - **Correct first try** → advance. (Later: grade GOOD/EASY.)
   - **Wrong** → reveal the correct move, mark the attempt failed. (Later: grade AGAIN.)
4. Continue down the line — the app plays the next opponent reply (branching toward other
   eligible cards) until the line ends.
5. Record each attempt (`ReviewLog`). In Phase 4 this also reschedules the `Card`.
6. **Session summary:** cards reviewed, accuracy, (Phase 4: next-due preview).

**Opponent branch selection:** when an opponent node has multiple replies, prefer the
branch leading to eligible/weak cards; otherwise play the main line. Keeps sessions
focused on what needs work.

---

## 7. Building a repertoire (input methods)

1. **PGN import** (primary): paste PGN or upload `.pgn`. Parse with chess.js; variations
   (`(...)`) become tree branches. Mark moves of the repertoire color as player moves.
2. **Lichess study import**: fetch study PGN via Lichess API
   (`GET /study/{id}.pgn`), then run the PGN importer.
3. **Manual editor**: interactive board; play moves to add nodes, click existing nodes
   to branch, set comments/NAGs. Toggle which color is "you".

---

## 8. Stats & dashboard

- **Dashboard:** due-today count, current streak, per-repertoire due badges, mastery %.
- **Stats page:** reviews over time (line chart), accuracy by opening (bar), retention
  rate, calendar heatmap of review activity (GitHub-style), lapse list ("leeches").

---

## 9. Build phases

> Full-featured is the goal, but ship in vertical slices so something is live early.
> Revised order: **guest-mode first**, drilling before scheduling, **FSRS as its own phase**.

- **Phase 0 — Skeleton live.** Scaffold Next.js + Tailwind + Prisma. Neon DB. **Guest
  session** (signed cookie → guest `User` row). Landing + dashboard shell. Deploy to
  Vercel. (Goal: a real URL on day one, usable with zero signup.)
- **Phase 1 — Repertoires + viewer.** Repertoire CRUD, MoveNode tree, PGN import, board
  viewer that walks the tree.
- **Phase 2 — Drill engine (no scheduling).** Card generation, "drill whole repertoire /
  line" selector, traversal loop, correct/wrong feedback, `ReviewLog`. The product is
  *usable* end-to-end here.
- **Phase 3 — Editor + Lichess import.** Manual move editing, branching, Lichess studies.
- **Phase 4 — Spaced repetition + real accounts.** Swap in the FSRS selector + due queue
  + "due today" dashboard. Add Auth.js OAuth and a **"claim your guest data"** upgrade
  flow that re-parents guest repertoires to the new account.
- **Phase 5 — Stats + polish.** Review history, accuracy by opening, calendar heatmap,
  board themes, settings, responsive/mobile, empty states, demo seed.
- **Phase 6 (optional) — AI/MCP angle.** OpenAPI spec + an MCP server exposing
  "list due cards / submit review", so the app is agent-accessible (mirrors chessreps;
  fits the AILabs theme). Strong portfolio differentiator.

---

## 10. Portfolio polish (don't skip)

- Seeded **demo account / guest mode** so a recruiter can try it without signing up.
- Clean README with screenshots + GIF of a drill session + live link.
- A few **Vitest** tests on the chess/SRS logic (shows you test the hard parts).
- Lighthouse-decent landing page; OG image; custom domain.

---

## 11. Guest mode (no signup)

Recruiters and casual visitors get a full experience without creating an account.

- On first visit, a server action mints a **guest `User`** (`isGuest = true`) and sets a
  **signed, http-only cookie** (`guestId`). Every subsequent request resolves the user
  from that cookie.
- All data (repertoires, cards, logs) hangs off this guest user exactly like a real one —
  **the data model is identical**, so nothing special is needed downstream.
- A pre-seeded **demo repertoire** (e.g. a short Italian Game) is cloned into each new
  guest so the app is never empty on first load.
- **Phase 4 upgrade path:** when a guest signs in with OAuth, re-parent their guest rows
  to the new account (`UPDATE ... SET userId = realUser WHERE userId = guestUser`) and
  drop the guest. "Claim your progress" — zero data loss.
- Housekeeping: a cron/Vercel job prunes guest users with no activity after N days.

`User` gains: `isGuest boolean default false`.

---

## 12. Core algorithms (reference)

### PGN → MoveNode tree
```
parseRepertoire(pgn, color):
  game = chess.js loadPgn(pgn)            # validates + expands variations
  root = null
  walk(node, parent):
    for each move in node.mainline + node.variations:
      san  = move.san
      chess.move(san)                     # advance a chess.js instance
      n = MoveNode{
        parentId: parent?.id,
        ply: chess.history().length,
        san, uci: move.from+move.to(+promo),
        fenAfter: chess.fen(),
        isPlayerMove: (sideThatJustMoved == color),
      }
      persist(n)
      walk(move.next, n)                   # recurse into continuation + sub-variations
      chess.undo()
  walk(game.firstMove, root)
  # then: for every isPlayerMove node, create a Card(userId, moveNodeId)
```

### Drill traversal (engine)
```
runDrill(repertoire, eligible: Set<moveNodeId>):
  chess = new Chess(repertoire.startFen)
  node  = root(repertoire)
  while node has children:
    if sideToMove == repertoire.color:        # YOUR turn → a card
        target = childPlayerMove(node)
        if target.id in eligible:
            answer = await userPlaysMove()       # board interaction
            if answer.uci == target.uci:
                record(target, PASS); chess.move(target.san)
            else:
                reveal(target); record(target, FAIL); chess.move(target.san)
        else:
            chess.move(target.san)               # not eligible → autoplay
        node = target
    else:                                      # opponent → app plays
        reply = pickOpponentBranch(node, eligible)  # bias toward eligible cards
        chess.move(reply.san); node = reply
  return sessionSummary(records)
```

### Card eligibility (the swappable selector)
```
Phase 2:  eligible = all player MoveNodes in chosen repertoire/line
Phase 4:  eligible = Card.where(userId, due <= now)   # FSRS-scheduled
```

---

## 13. Decisions locked / still open

**Locked:** Next.js full-stack · Tailwind/shadcn · Prisma + Neon · Vercel ·
guest-mode-first (OAuth later) · scheduler deferred to Phase 4 · pnpm.

**Still open (not blocking design):**
- FSRS vs SM-2 — decide at Phase 4 (FSRS recommended).
- OAuth providers for Phase 4 — GitHub and/or Google.
- Project display name + domain for the live link.
- Lichess import in Phase 3 — confirm scope (studies only, or also user games?).
