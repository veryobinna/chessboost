# ♟ ChessBoost

Train your chess **opening repertoire** with **spaced repetition**. Build your lines,
then drill them — the app plays the opponent and quizzes you on your moves so the right
continuation becomes automatic.

> Portfolio project. Full design and roadmap in [DESIGN.md](./DESIGN.md).

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind 4**
- **Prisma 6** + **PostgreSQL** (local via Docker; Neon in production)
- **Guest sessions** via a signed, http-only cookie (no sign-up required)
- Deploys to **Vercel**

## Getting started

Requires **Node 24** (see `.nvmrc`), **pnpm**, and **Docker** (for the local database).

```bash
nvm use                  # Node 24
pnpm install

cp .env.example .env     # then adjust if needed
docker compose up -d     # local Postgres on :5433
pnpm db:push             # create tables

pnpm dev                 # http://localhost:3000
```

## Scripts

| Script           | What it does                     |
| ---------------- | -------------------------------- |
| `pnpm dev`       | Start the dev server             |
| `pnpm build`     | Production build                 |
| `pnpm db:push`   | Sync the Prisma schema to the DB |
| `pnpm db:studio` | Open Prisma Studio               |

## Project status

Built in vertical slices (see DESIGN.md §9):

- [x] **Phase 0** — Scaffold, guest sessions, data model, landing + dashboard, deployable
- [ ] **Phase 1** — Repertoire CRUD, PGN import, board viewer
- [ ] **Phase 2** — Drill engine
- [ ] **Phase 3** — Editor + Lichess import
- [ ] **Phase 4** — Spaced repetition (FSRS) + real accounts
- [ ] **Phase 5** — Stats + polish
