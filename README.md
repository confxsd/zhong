# 仲 Zhōng — Chinese Study Companion

Select (or paste) any Chinese text → Zhōng teaches it like a real tutor:
natural translation, character-by-character breakdown, grammar notes, context
tips — then quietly saves the new words to **your** memory and quizzes you later
with spaced repetition.

Built to be fast, local-first, and provider-agnostic (DeepSeek by default).

## Quick start

Requires Node 20+.

```bash
npm install
cp .env.example .env        # then add your DEEPSEEK_API_KEY
npm run dev                 # web on http://localhost:5173, API on :4450
```

Production build / single-process mode:

```bash
npm run build
npm start                   # serves web UI + API on http://localhost:4450
```

Your data lives in `apps/server/data/zhong.db` (SQLite, one file — back it up by
copying it).

## Select text from any webpage (bookmarklet)

Drag this into your bookmarks bar, then select Chinese text on any page and
click it:

```
javascript:(function(){const t=(window.getSelection?window.getSelection().toString():'')||'';if(!t){alert('Select some Chinese text first!');return;}window.open('http://localhost:5173/?text='+encodeURIComponent(t),'_blank')})();
```

(The app reads the `?text=` parameter and pre-fills the study box — the future
browser-extension / Electron route takes the same path.)

## How it works

```
web (React) ──/api──▶ server (Express + SQLite)
                        │
                        └─▶ provider.chatJson()  ← any OpenAI-compatible model
```

1. **Teach** — `POST /api/translate` sends the text plus a profile of what you
   already know ("student studied 37 words; 晚饭 → dinner appears here").
   The model returns structured JSON: translation, pinyin, segments with
   literal glosses, character breakdown, grammar points, study notes, and new
   vocabulary.
2. **Memory** — new words are upserted into `vocab`. Words you've already
   studied are *recognized* and flagged, so the tutor builds on them instead of
   re-teaching them.
3. **Review** — a Leitner-box SRS (`box 0–7`, intervals 1/1/2/4/7/14/30/60
   days) feeds the flashcards. Grades: Again / Hard / Good / Easy.
4. **History** — every session is kept; reopen it any time.

## Project layout

```
apps/
  server/   Express 5 · better-sqlite3 · zod — API, AI layer, SRS engine
    src/ai/       provider-agnostic model layer (interface + adapters)
    src/services/ teach.ts (prompt + persistence), srs.ts (spaced repetition)
    src/routes/   translate / vocab / review / sessions
  web/      React 19 · Vite 6 · Tailwind 4 · TanStack Query · react-router
```

## Switching AI providers

The model layer is provider-agnostic (`src/ai/types.ts`). Every built-in
provider speaks the OpenAI-compatible protocol, so switching is config-only:

```bash
# OpenAI
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# DeepSeek (default)
DEEPSEEK_API_KEY=sk-...

# Any other OpenAI-compatible endpoint: Ollama, Groq, LM Studio, Together...
AI_PROVIDER=openai-compatible
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3
```

For a custom protocol, implement `AIProvider` and register it in
`src/ai/provider.ts`.

## API surface

| Method | Path                 | Purpose                          |
| ------ | -------------------- | -------------------------------- |
| GET    | `/api/health`        | provider + stats                 |
| POST   | `/api/translate`     | teach a text (saves session+vocab) |
| GET    | `/api/sessions`      | history list                     |
| GET    | `/api/sessions/:id`  | full session detail              |
| DELETE | `/api/sessions/:id`  |                                  |
| GET    | `/api/vocab`         | library, filter by status/search |
| DELETE | `/api/vocab/:id`     |                                  |
| GET    | `/api/review/due`    | cards due now                    |
| POST   | `/api/review/:id`    | grade a card (`again/hard/good/easy`) |

## Roadmap

- Electron / macOS menubar wrapper (server already serves the production build)
- Browser extension (selection → bubble)
- Streaming responses, text-to-speech for pinyin
- Export/import study data, CSV flashcards
- SRS tuning, per-word notes by hand