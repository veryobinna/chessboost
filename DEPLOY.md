# Deploying ChessBoost

Target: **Vercel** (Next.js app) + **Neon** (serverless Postgres). Both have free tiers.

## 1. Create the production database (Neon)

1. Sign up at https://neon.tech and create a project (name it `chessboost`).
2. In the project's **Connection Details**, copy **two** connection strings:
   - **Pooled** (host contains `-pooler`) → this is `DATABASE_URL`
   - **Direct** (no `-pooler`) → this is `DIRECT_URL`
   Both should end with `?sslmode=require`.

## 2. Apply the schema to Neon (once, from your machine)

```bash
cd chessboost
DATABASE_URL="<neon-pooled-url>" DIRECT_URL="<neon-direct-url>" pnpm db:push
```

This creates all tables in Neon. (`db push` uses `DIRECT_URL` for the DDL.)

## 3. Push the code to GitHub

```bash
# create an empty repo on GitHub first (no README), then:
git remote add origin git@github.com:<you>/chessboost.git
git push -u origin main
```

## 4. Import into Vercel

1. Sign in at https://vercel.com and **Add New → Project**, import the GitHub repo.
2. Framework preset: **Next.js** (auto-detected). Leave build/install commands default
   — `pnpm install` runs `prisma generate` via the `postinstall` script.
3. Under **Environment Variables**, add (Production, and Preview if you want):
   | Name           | Value                                            |
   | -------------- | ------------------------------------------------ |
   | `DATABASE_URL` | the Neon **pooled** URL                          |
   | `DIRECT_URL`   | the Neon **direct** URL                          |
   | `GUEST_SECRET` | a random 32-byte secret (`openssl rand -base64 32`) |
4. **Node.js Version**: 22.x or newer (matches `.nvmrc`).
5. **Deploy.**

## 5. Verify

- Open the deployed URL → landing page loads.
- Visit `/dashboard` → a guest session is created (cookie `cb_guest`), stats render.
- Import a repertoire → it persists to Neon.

## Notes

- **Schema changes later:** re-run step 2 against Neon after editing `schema.prisma`.
- **Secret:** never reuse the local dev secret in production; set `GUEST_SECRET` in Vercel.
- **No GitHub?** You can deploy straight from your machine instead:
  `npx vercel` (preview) / `npx vercel --prod` (production), then add the same env vars
  with `vercel env add`.
- The signed guest cookie is marked `Secure` automatically in production (HTTPS).
