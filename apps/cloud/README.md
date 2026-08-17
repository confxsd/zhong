# @zhong/cloud — Cloudflare deployment

Cloudflare Worker + D1 backend for Zhong (仲), a Chinese learning companion.
Serves the API and the web UI at **https://zhong.rome.markets**.

- **API**: Hono on Cloudflare Workers (same contract as the local Express server in `apps/server`)
- **DB**: D1 (SQLite) — vocab, sessions, SRS state, review log, rate limits
- **Assets**: web UI build synced from `apps/web` (SPA fallback)
- **AI**: DeepSeek (default) via `wrangler secret put DEEPSEEK_API_KEY`

## Layout

```
src/                 Worker source (routes, services, AI provider)
migrations/          D1 schema migrations
public/              Web UI build output (gitignored, synced from apps/web)
scripts/sync-web.sh  Build web in the monorepo root and copy dist -> public/
.dev.vars.example    Template for local secrets (copy to .dev.vars)
```

## Secrets

Production secrets are NOT in this repo — set them once on the worker:

```bash
npx wrangler secret put DEEPSEEK_API_KEY
```

Optional providers (set `AI_PROVIDER=openai` or `AI_PROVIDER=openai-compatible`
in `wrangler.toml [vars]` to use them): `OPENAI_API_KEY`, `AI_API_KEY`.

Local dev secrets go in `.dev.vars` (gitignored) — see `.dev.vars.example`
for the full template.

## Deploy

```bash
npm run sync:web       # rebuild web UI from apps/web into public/
npm run deploy         # wrangler deploy
# or: npm run deploy:full
# from the repo root: npm run deploy:cloud
```

New schema changes go in `migrations/` and are applied with
`npm run db:apply:remote` (i.e. `wrangler d1 migrations apply zhong --remote`).

## Cost notes

- D1 and Worker traffic: well within free allowances (single user).
- `/api/translate` is rate-limited per IP (60/hour) to protect the DeepSeek budget.
