# 仲 Zhōng

Zhōng is a Chinese learning companion for macOS. Select Chinese text anywhere,
get a fast beginner-friendly explanation, and save the useful words for review.

![Inline quick lesson](docs/screenshots/selection-lesson.png)

The native picker reads selections across macOS apps, including Electron
apps. It renders the first lesson in place instead of forcing a
browser redirect.

![Vocabulary library](docs/screenshots/library.png)

## Features

- Inline selection pill and teaching card for Chinese text across macOS
- Translation, pinyin, grammar, context, vocabulary, and learning tips
- Persistent SQLite vocabulary memory and study history
- Leitner-style spaced repetition review
- Dark responsive web library and review experience
- Provider-agnostic AI layer: DeepSeek, OpenAI, Ollama, Groq, and other
  OpenAI-compatible APIs
- Native macOS Services integration
- Native menubar app with background server control

## Quick Start

Requires Node 20+ and macOS Xcode Command Line Tools for native integrations.

```bash
npm install
cp .env.example .env
# Add DEEPSEEK_API_KEY to .env
npm run dev
```

Open `http://localhost:5173` in development. Production mode:

```bash
npm run build
npm start
```

Data is stored locally at `apps/server/data/zhong.db`.

## Global Command

Install the command once from this repository:

```bash
npm link
```

```text
zhong                    Start the background app and open the browser
zhong dev                Development mode with hot reload
zhong status             Server, menubar, picker, and service status
zhong stop               Stop the background server
zhong restart            Restart the background server
zhong build              Rebuild server and web
zhong logs               Show recent runtime logs
```

## macOS Integrations

### Instant Picker

```bash
zhong install-picker
```

Grant `ZhongPicker` access under **System Settings → Privacy & Security →
Accessibility**. Then select Chinese text in Safari, Chrome, Cursor, Notes,
Word, or other apps. The `中` pill stays available until you explicitly close
it. Long lessons are scrollable and render inline.

Remove it with `zhong uninstall-picker`.

### Menubar And Startup

```bash
zhong install-startup
```

This installs the server and native `中` menubar app as launchd agents. The
menubar menu opens Study, Review, and Library and can start or stop the server.

Use `zhong uninstall-startup` to remove both login items.

### macOS Services

```bash
zhong install-services
```

This installs `ZhongService.app` into `~/Library/Services`. In apps that expose
Services, select text and choose **Services → Teach with Zhōng**. Chrome and
some Electron apps hide that menu; use the Instant Picker instead.

## AI Providers

DeepSeek is the default:

```bash
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat
```

OpenAI:

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

Any OpenAI-compatible endpoint:

```bash
AI_PROVIDER=openai-compatible
AI_API_KEY=...
AI_BASE_URL=http://localhost:11434/v1
AI_MODEL=llama3
```

The provider interface lives in `apps/server/src/ai/types.ts`.

## Structure

```text
apps/server/       Express API, SQLite, AI providers, SRS
apps/web/          React, Vite, Tailwind, library and review UI
apps/picker/       Native macOS selection overlay
apps/menubar/      Native macOS menubar app
apps/service/      Native macOS Services host
bin/zhong          Global macOS lifecycle CLI
```

## Development Checks

```bash
npm test
npm run typecheck
npm run build
```

Runtime files and local secrets are ignored by git. The SQLite database remains
local to the machine.
