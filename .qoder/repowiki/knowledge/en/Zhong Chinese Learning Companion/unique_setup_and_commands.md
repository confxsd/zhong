`wrangler dev --port 4450` runs the local worker; `wrangler d1 migrations apply zhong` applies D1 migrations locally and `wrangler d1 migrations apply zhong --remote` for production; `npm run sync:web` builds and copies the frontend SPA from the web app's `dist` into `public/`; `npm run deploy:full` runs both steps then deploys via `wrangler deploy`. The HSK1 track self-seeds on first `/api/tracks` or `/api/plan` request after migration 0002 (idempotent, `seedTracksIfEmpty`). Curriculum data lives in `src/data/hsk1.ts`. Root `npm run dev` runs Vite + `wrangler dev` together; tests are `npm test` (vitest in apps/cloud).

Migration + deploy sequence after schema changes:
```bash
cd apps/cloud
npx wrangler d1 migrations apply zhong --remote
npm run deploy:full
```
