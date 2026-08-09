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
copying it). Server runtime files live in `~/.zhong/` (PID + logs).

## Global CLI: `zhong`

Install the `zhong` command once (works from any directory, from zsh, iTerm,
Alfred, etc.):

```bash
npm link                    # in the repo — creates the global `zhong` command
```

| Command | What it does |
| --- | --- |
| `zhong` | Start the app as a background process (rebuilds if sources changed) and open the browser |
| `zhong dev` | Development mode (hot reload) on http://localhost:5173 |
| `zhong stop` / `zhong restart` | Stop / restart the background server |
| `zhong status` | Show server + startup-item status |
| `zhong build` | Rebuild server and web |
| `zhong menubar` | Launch the menubar app (中 icon) without a login item |
| `zhong install-services` | Build + register the system service host (`~/Library/Services/ZhongService.app`) — right-click → Services → Teach with Zhōng in every app |
| `zhong uninstall-services` | Remove the system service |
| `zhong install-picker` | Install the instant selection pill (中 appears at any selection — all apps incl. Chrome; needs one-time Accessibility grant) |
| `zhong uninstall-picker` | Remove the selection pill |
| `zhong install-startup` | **Auto-start at login** — installs two launchd LaunchAgents: the server (`com.zhong.server`, keeps it alive in the background) and the menubar app (`com.zhong.menubar`) |
| `zhong uninstall-startup` | Remove both login startup items |
| `zhong logs` | Tail the last 50 log lines |

Startup-item flow: run `zhong install-startup` once → a 中 icon appears in the
menu bar (top right) and the server silently runs from login onward → `zhong`
then just opens the browser to an already-running app. The menubar icon shows
live server status, opens the app's pages, and can start/stop the server. No
dock icon, no terminal window needed.

## Menu bar app

Native menu-bar status item (Swift/AppKit, built on the fly by `swiftc` —
requires Xcode Command Line Tools). Click the 中 icon:

- **Open Zhōng / Review / Library** — opens those pages
- **Start / Stop server** — controls the background server via the CLI
- Live status row: `● Server running` / `○ Server stopped` (polls every 3s)

Source: `apps/menubar/StatusBarApp.swift`, build: `apps/menubar/build.sh`
→ `~/.zhong/ZhongMenubar.app` (server state and logs live in `~/.zhong/`).

## macOS system-wide: right-click → Teach with Zhōng

`zhong install-services` builds and installs a small **service host app**
(`apps/service/`, → `~/Library/Services/ZhongService.app`) that macOS itself
launches on demand. It works in **every** app:

1. Select any Chinese text in Safari, Notes, Pages, Mail, Word, TextEdit…
2. Right-click → **Services → Teach with Zhōng**
3. The lesson opens with your selection pre-filled (an alert appears if the
   server isn't running).

`zhong install-startup` registers it automatically; service menus are cached
per app, so relaunch the app you test in (or log out/in) after installing.
Apps that hide the Services submenu (Chrome, Electron-based apps) still work
via a global hotkey, which you can bind here:

> System Settings → Keyboard → Keyboard Shortcuts → **Services → Text**
> → assign a shortcut to "Teach with Zhōng" (e.g. ⌥⌘T)

`zhong uninstall-services` removes the service host.

## Instant selection pill — any app, including Chrome (PopClip-style)

`zhong install-picker` installs `ZhongPicker` (Swift, public Accessibility API):
select any Chinese text **anywhere** on screen — Safari, Chrome, VS Code,
Notes, Word, Pages… — and a small **中 pill appears beside the selection**.
Click it → a compact teaching card renders in place with the translation,
pinyin, grammar, useful words, and a full-lesson button. It does not redirect
you away just to get the first explanation.

- **One-time setup:** grant Accessibility access to "ZhongPicker" in
  System Settings → Privacy & Security → Accessibility (the picker opens that
  pane for you). It explains itself in a floating window until granted.
- Runs silently at login (`com.zhong.picker`, launchd `KeepAlive`), no dock
  icon — the same always-on model as the menubar app and server.
- Works in Chrome and Electron apps (which hide the Services menu), because it
  reads the selection directly instead of through context menus. Electron apps
  without an AX focused element use a clipboard-preserving Cmd+C fallback.
- `zhong uninstall-picker` removes it; `zhong status` shows its state.

Source: `apps/picker/PickerApp.swift` (floating `NSPanel` + AX polling,
~0.45s latency, pinned until the explicit close control).

## Chrome extension (right-click → teach)

Select any Chinese text in Chrome, right-click → **仲 Zhōng — teach this text**
→ the lesson opens in a new tab with your selection pre-filled. If the server is
off it shows a notification instead.

Install (one-time):

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. **Load unpacked** → choose `extensions/chrome` in this repo

Source: `extensions/chrome/` (Manifest V3, context-menus only — no tracking,
no page access). The future browser-extension follow-ups (bubble translator,
keyboard shortcuts) build on this same directory.

## Select text from any webpage (bookmarklet)

Drag this into your bookmarks bar, then select Chinese text on any page and
click it:

```
javascript:(function(){const t=(window.getSelection?window.getSelection().toString():'')||'';if(!t){alert('Select some Chinese text first!');return;}window.open('http://localhost:4450/?text='+encodeURIComponent(t),'_blank')})();
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

- Browser extension (selection → bubble)
- Streaming responses, text-to-speech for pinyin
- Export/import study data, CSV flashcards
- SRS tuning, per-word notes by hand
