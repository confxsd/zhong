# Zhōng 2.0 — Implementation Plan

Grounded in the current codebase. Production = `apps/cloud` (Cloudflare
Worker + D1, Hono, zhong.rome.markets). Local dev mirror = `apps/server`
(Express + better-sqlite3). UI = `apps/web` (React/Vite/Tailwind/TanStack
Query). macOS = `apps/picker`, `apps/menubar`, `apps/service`, `bin/zhong`.
iOS = `apps/ios`. Feature IDs from `features.md`.

## 1. Rollout rules (apply to every phase)

1. Implement in `apps/cloud` (prod) and mirror behavior in `apps/server`
   (dev) — today they intentionally share near-identical `services/` and
   `ai/` files. Keep that parity.
2. Schema changes ship as D1 migration files in `apps/cloud/migrations/`
   (e.g. `0002_*.sql`), applied with `npm run db:apply:remote -w @zhong/cloud`;
   the local server applies the same DDL in `apps/server/src/db/index.ts`.
3. Existing API shapes stay backward-compatible (additive fields/endpoints).
4. Verify with `npm test`, `npm run typecheck`, `npm run build` before
   deploy; deploy via `npm run deploy:cloud` (syncs web → cloud worker).
5. Update `.qoder/repowiki/` docs when phase code lands (project convention).

## 2. Schema evolution

### Migration 0002 — memory spine (Phase 0)

```sql
-- vocab gains FSRS state; Leitner columns kept for compat/UI
ALTER TABLE vocab ADD COLUMN fsrs_state TEXT; -- JSON: due, stability, difficulty, reps, lapses, state
ALTER TABLE vocab ADD COLUMN audio_path TEXT; -- cached TTS key (optional)

CREATE TABLE study_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  study_date TEXT NOT NULL,          -- YYYY-MM-DD
  new_words INTEGER NOT NULL DEFAULT 0,
  reviews INTEGER NOT NULL DEFAULT 0,
  seconds INTEGER NOT NULL DEFAULT 0,
  streak_kept INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX idx_study_log_date ON study_log(study_date);

CREATE TABLE profile (k TEXT PRIMARY KEY, v TEXT NOT NULL);
```

### Migration 0003 — tracks & concepts (Phases 1–2)

```sql
CREATE TABLE tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,         -- 'hsk1', 'survival-1', ...
  title TEXT NOT NULL,
  kind TEXT NOT NULL,                -- 'hsk' | 'survival' | 'pack'
  meta TEXT NOT NULL DEFAULT '{}'
);
CREATE TABLE track_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  sort INTEGER NOT NULL,
  type TEXT NOT NULL,                -- 'word' | 'grammar' | 'module'
  payload TEXT NOT NULL,             -- JSON: hanzi/pinyin/meaning or concept slug
  UNIQUE (track_id, sort)
);
CREATE TABLE track_progress (
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES track_items(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'new', -- new | learning | done
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (track_id, item_id)
);
CREATE TABLE concepts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,         -- 'ba-structure', 'le-aspect', ...
  title TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'grammar', -- grammar | theme | cultural
  body TEXT NOT NULL DEFAULT '{}'    -- JSON: explanation, examples, level
);
CREATE TABLE vocab_concepts (
  vocab_id INTEGER NOT NULL REFERENCES vocab(id) ON DELETE CASCADE,
  concept_id INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  PRIMARY KEY (vocab_id, concept_id)
);
CREATE TABLE concept_edges (
  from_id INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  to_id INTEGER NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
  rel TEXT NOT NULL DEFAULT 'related',
  PRIMARY KEY (from_id, to_id, rel)
);
CREATE TABLE vocab_links (
  a_id INTEGER NOT NULL REFERENCES vocab(id) ON DELETE CASCADE,
  b_id INTEGER NOT NULL REFERENCES vocab(id) ON DELETE CASCADE,
  rel TEXT NOT NULL,                 -- synonym | antonym | radical-family | collocation | theme
  PRIMARY KEY (a_id, b_id, rel)
);
-- sessions gain a kind column (backward compatible)
ALTER TABLE sessions ADD COLUMN kind TEXT NOT NULL DEFAULT 'teach';
-- 'teach' | 'dialogue' | 'synthesis' | 'essay' | 'ingest'
```

### Migration 0004 — interest engine & trails (Phases 2–3)

```sql
CREATE TABLE sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  channel TEXT NOT NULL,             -- art | symbolism | history | politics | modern
  kind TEXT NOT NULL DEFAULT 'article', -- article | feed-item | digest
  url TEXT, title TEXT NOT NULL,
  body TEXT NOT NULL,
  level TEXT NOT NULL DEFAULT 'auto',
  ingested_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE trails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  origin_kind TEXT NOT NULL,         -- 'word' | 'concept' | 'session'
  origin_id INTEGER NOT NULL,
  steps TEXT NOT NULL DEFAULT '[]',  -- JSON: ordered explore-chain steps
  current_step INTEGER NOT NULL DEFAULT 0,
  saved INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Migration 0005 — dialogues (Phase 4)

```sql
CREATE TABLE dialogues (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scenario TEXT NOT NULL,
  title TEXT NOT NULL,
  turns TEXT NOT NULL DEFAULT '[]',  -- JSON: [{role, hanzi, pinyin, translation, correction?}]
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE pronunciation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vocab_id INTEGER REFERENCES vocab(id) ON DELETE SET NULL,
  phrase TEXT NOT NULL,
  tones_expected TEXT NOT NULL,      -- '3-1' per syllable
  tones_heard TEXT NOT NULL,
  accurate INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

Local server mirrors all DDL in `apps/server/src/db/index.ts` `db.exec`.

## 3. FSRS swap (F-001)

- Add `ts-fsrs` dependency to `apps/cloud` and `apps/server`
  (`npm i ts-fsrs -w @zhong/cloud -w @zhong/server`). It is pure TS,
  Cloudflare-compatible, MIT.
- Replace `services/srs.ts` internals in both apps: keep exported
  signatures (`applyGrade(db, row, grade)`, `dueCards`, `nextDueCount`,
  `stats`) so routes don't change.
- Mapping: `again→Again, hard→Hard, good→Good, easy→Easy`; store
  `fsrs_state` JSON on the vocab row; seed state for legacy rows on first
  grade (use `review_count`/`box` as heuristics for initial stability).
- Retention target 0.9; default FSRS params initially; optional per-user
  parameter retraining from `review_log` as a local script (Phase 5 ops).
- `srs.ts` due query changes to `ORDER BY fsrs due ASC` computed in JS
  (fetch candidates, sort by `state.due`), preserving the 100-card cap.
- Rewrite `apps/server/src/services/srs.test.ts` for the new logic; add
  `apps/cloud` side tests with a mock D1 binding (or share pure functions
  via a small `packages/srs-core` if duplication grows).
- UI: `ReviewPage` already renders interval labels from `box` — switch to
  FSRS predicted intervals (`nextIntervalLabel` in `apps/web/src/lib/format.ts`
  reads `card.fsrs` instead).

## 4. AI layer extensions

`apps/{server,cloud}/src/ai/schema.ts` gains (all additive):

```ts
export const componentSchema = z.object({ char: z.string(), meaning: z.string(), role: z.string().optional() });
export const breakdownItemSchema = breakdownItemSchema.extend({
  components: z.array(componentSchema).optional(),
  radical: z.string().optional(),
  etymology: z.string().optional(),   // origin/evolution note, well-attested only
  mnemonic: z.string().optional(),
});
export const conceptRefSchema = z.object({ slug: z.string(), title: z.string(), note: z.string().optional() });
export const linkRefSchema = z.object({ hanzi: z.string(), rel: z.string(), meaning: z.string().optional() });
// teachOutputSchema extends: concepts: conceptRefSchema[], links: linkRefSchema[]
```

New schemas per feature:

| Feature | Schema (zod) |
|---|---|
| F-201 deep layer | `exploreOutputSchema`: `{ etymology?, components[], cultural[], historical[], related: linkRefSchema[], level }` |
| F-206 trails | reuse `exploreOutputSchema` per step; steps persisted in `trails.steps` |
| F-304 synthesis | `synthesisSchema`: `{ title, text, pinyin, glosses: [{hanzi, meaning}], words_used: string[] }` |
| F-401 dialogue | `dialogueTurnSchema`: `{ reply_hanzi, reply_pinyin, translation, correction?, suggested_replies: string[], done }` |
| F-303 digest | `digestSchema`: `{ items: [{title, summary, sentences: [{hanzi, pinyin, gloss}] }] }` |
| F-402 tone eval | server-side: transcribe via speech-to-text provider → compare pinyin/tone template → `pronunciation_log` row |

`teach.ts` changes:
- `buildMessages()` reads profile lenses (F-305/F-901), passes concept
  library snapshot (slug+title only, top-N by relevance) so the model
  references instead of re-teaching (F-203).
- System prompt v2 adds: depth layer instructions, etymology/radical
  guidance (standard Mandarin, simplified, pinyin — no Cantonese/HK),
  concept reference format, association link proposals (F-204).
- New services: `services/explore.ts`, `services/synthesis.ts`,
  `services/dialogue.ts`, `services/digest.ts`, `services/tracks.ts`,
  `services/plan.ts`, `services/ingest.ts`, `services/graph.ts`.

## 5. Endpoint inventory (new, additive)

| Endpoint | Phase | Notes |
|---|---|---|
| `POST /api/translate` (extended output) | 1–2 | `?depth=deep` triggers etymology/links pass |
| `POST /api/explore` | 2 | `{target: {kind, id}}` → explore output; appends to trail |
| `GET/POST /api/trails` | 2 | resume via `current_step` |
| `GET /api/tracks`, `GET /api/tracks/:slug`, `POST /api/tracks/:slug/lesson` | 1 | daily lesson generator (F-102) |
| `GET /api/plan` | 1 | today's plan (F-103) |
| `GET/PUT /api/profile` | 1 | (F-901) |
| `POST /api/ingest` | 3 | URL → text extraction (F-302) |
| `GET /api/channels/:channel`, `GET /api/digest` | 3 | (F-301/F-303) |
| `POST /api/synthesis` | 3 | (F-304) |
| `POST /api/dialogue`, `POST /api/dialogue/:id` | 4 | (F-401) |
| `POST /api/pronunciation/eval` | 4 | multipart audio (F-402) |
| `GET /api/graph?target=word:ID|concept:slug` | 5 | (F-501) |
| `POST /api/essay/feedback` | 5 | (F-504) |
| `GET /api/metrics` | 4 | (F-904) |

All routes validate with zod (project convention), go through
`getProvider(env)`, and reuse the rate-limit service with per-endpoint
budgets (F-902).

## 6. Web UI changes

- `apps/web/src/App.tsx` nav becomes: **Study** (`/`, TranslatePage),
  **Library**, **Review**, **Speak** (`/dialogue`, Phase 4), **Explore**
  (`/explore`, channels + digest, Phase 3), **Track** (`/track`, Phase 1),
  **History**. Sidebar stats panel gains streak + retention (F-004).
- `ResultView.tsx`: depth tabs (quick/standard/deep); deep renders
  etymology cards (components, radical, mnemonic), concept chips
  (→ concept page), link chips (→ word page).
- `ReviewPage.tsx`: context sentence block with TTS (F-002); mode badge
  per card (F-003); FSRS interval labels (F-001); batch framing (F-006).
- New pages: `TrackPage` (progress, badges, daily lesson), `ExplorePage`
  (channels, digest), `DialoguePage` (turn-based chat with audio),
  `WordPage` (`/word/:hanzi`: graph, explainer chains, links), `ConceptPage`
  (`/concept/:slug`), `PlanWidget` on Study page (F-103), `SettingsPage`
  (lenses, quotas).
- `apps/web/src/types.ts` extends `TeachResult`, `ReviewCard`, new API
  types; `api/client.ts` gains the endpoint wrappers.

## 7. Audio & speech

- Existing Google TTS cloud route (`apps/cloud/src/routes/tts.ts`) is
  reused for all audio. Add rate presets (0.5/0.65/1.0) — the web layer
  already passes `rate`; store per-word "mature" flag to suggest native
  speed (F-403).
- Tone ID drills (F-003) and dictation (F-602) need per-syllable audio:
  fetch TTS per syllable (cached at edge).
- Speech recognition (F-402): `MediaRecorder` in browser → multipart to
  `/api/pronunciation/eval` → provider STT (e.g. DeepSeek has no STT; use
  OpenAI Whisper-compatible or Cloudflare AI `whisper` binding as provider
  decision at Phase 4) → template tone comparison → `pronunciation_log`.

## 8. Phase-by-phase file map

### Phase 0 (FSRS + context + dashboard)
- `apps/cloud/migrations/0002_memory_spine.sql`, `apps/server/src/db/index.ts`
- `apps/cloud/src/services/srs.ts`, `apps/server/src/services/srs.ts`
- `apps/cloud/src/routes/review.ts` (cards joined with context),
  `apps/server/src/routes/review.ts`
- `apps/cloud/src/routes/stats*` extend (streak, retention),
  `apps/web/src/App.tsx` sidebar, `apps/web/src/pages/ReviewPage.tsx`,
  `apps/web/src/lib/format.ts`, `apps/web/src/types.ts`
- Tests: `apps/server/src/services/srs.test.ts` rewrite; cloud unit tests
  for scheduling pure functions.

### Phase 1 (bootcamp, HSK1, plan)
- Migrations `0003`; `apps/cloud/src/services/tracks.ts`,
  `services/plan.ts`; seed script for HSK1 track_items
  (`apps/cloud/scripts/seed-hsk1.mjs` — public HSK1 list).
- Web: `TrackPage.tsx`, `PlanWidget`, bootcamp drill components
  (syllable table, tone-pair quiz) under `apps/web/src/pages/Bootcamp/`.
- Local mirror: same in `apps/server`.

### Phase 2 (depth engine)
- Schema v2 + `explore.ts` + `trails` route; `ResultView` depth tabs;
  `ConceptPage`, `WordPage` (graph via simple SVG, no new deps);
  `services/graph.ts` builds edges from vocab_links + concept_edges.
- Tests: `schema.test.ts` extended for v2 shapes.

### Phase 3 (interest engine)
- Migration `0004`; `services/ingest.ts` (extraction: simple
  readability-style heuristics server-side; no heavy DOM needed for
  article pages — fallback to text-only), `services/digest.ts`,
  `services/synthesis.ts`; `ExplorePage`; `SettingsPage` lenses.

### Phase 4 (speak)
- Migration `0005`; `services/dialogue.ts`; `DialoguePage`;
  `pronunciation/eval` route + recorder hook
  (`apps/web/src/lib/recorder.ts`); HSK2 seed; survival modules 2–4.

### Phase 5 (polymath)
- `services/graph.ts` v2 (theme edges), graph viz page; explainer chains
  in `explore.ts` extended with lens param; HSK3 seed; grammar system page;
  `essay/feedback` route; FSRS param retraining script
  (`apps/cloud/scripts/retrain-fsrs.mjs`, local).

### Phase 6 (immersion + iOS)
- XMU pack seed; dictation drills in ReviewPage mode set; mock dialogues
  as dialogue scenarios; iOS: `apps/ios` — ReviewView, TrackView,
  DialogueView against existing API client; pre-arrival checklist page
  (web + iOS).

## 9. Testing & verification

- `npm test` (vitest, exists in `apps/server`; add cloud-side unit tests
  where pure functions exist).
- `npm run typecheck` (both apps) and `npm run build` at repo root before
  every phase merge.
- Manual phase acceptance per exit criteria in `roadmap.md`.
- Deploy: `npm run deploy:cloud` (sync web + wrangler deploy);
  migrations: `npm run db:apply:remote -w @zhong/cloud`.

## 10. Costs, limits, ops

- Each new AI endpoint consumes tokens; budget caps per endpoint
  (F-902) reuse the `rate_limits` table pattern with per-day windows.
- Rough cost guidance (DeepSeek, deepseek-chat, ~$0.3–0.6/M output tokens):
  translate ≈ 2–4k tokens; explore ≈ 1.5k; synthesis ≈ 2k; dialogue turn ≈
  1k; digest ≈ 3k. At current usage patterns this stays well under a few
  dollars/month; caps protect against runaway loops.
- TTS stays edge-cached (existing behavior); per-syllable drill audio
  should reuse a bounded cache key space.
- D1 growth is modest (text JSON rows); `sources` bodies are the largest
  — prune ingested articles older than N days or store only taught excerpts.
- Data is personal: no PII in metrics endpoint (F-904).
