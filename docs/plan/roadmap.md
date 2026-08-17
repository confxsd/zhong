# Zhōng 2.0 — Roadmap

Timeline anchor: **Aug 2026 → Sep 2027** (Xiamen departure, ~13 months).
Phases are learner-driven: the memory spine and pinyin foundations come first
because retention and pronunciation are the two things time must compound on.
Feature IDs map to `features.md`; technical detail lives in
`implementation.md`.

## Phase 0 — The Spine (Aug–Sep 2026) · shipped ✓

Make forgetting structurally impossible before volume arrives.

- F-001 FSRS engine replaces Leitner (per-word adaptive scheduling)
- F-002 Context-linked review cards (original sentence + source)
- F-003 Review modes: reading, listening, pinyin typing (tone identification lives in the Track-page drill)
- F-004 Streaks + retention dashboard
- F-006 Micro-session framing (chunked batches, live "done" feedback)

## Phase 1 — Foundations (Sep–Oct 2026) · core shipped ✓

The structured journey starts; pronunciation first (absolute beginner).

- F-101 Pinyin & tone bootcamp (tone drill + pinyin practice, in the Track page)
- F-102 HSK1 structured track with AI daily lessons (5 words/story)
- F-103 Daily plan with adaptive new-word quota
- F-104 Track progress page + mastery states (badges pending)
- F-105 Survival module 1 (greetings, self-intro, campus basics) — pending

**Exit criteria (Phase 0/1 core):** FSRS live with backward-compatible API;
every card shows its source sentence with audio; dashboard shows streak and
retention; he can read pinyin with tones, drill them, and progress through
the 150-word HSK1 track. Remaining: survival module 1.

## Phase 2 — Depth Engine (Oct–Nov 2026) · strengths amplified

Exploit high verbal/conceptual ability: hanzi as a symbolic system.

- F-201 Etymology layer (components, radicals, evolution notes, mnemonics)
- F-202 Depth-on-demand UI (quick / standard / deep)
- F-203 Concept library (grammar points as reusable, linked concepts)
- F-204 Association network (synonyms, antonyms, radical families)
- F-205 Character graph visualization
- F-206 Rabbit-hole trails (pausable explore chains, saved for return)

**Exit criteria:** Any lesson can be opened to "deep" and yields etymology
+ cultural/historical context; concepts persist and link to words; a rabbit
hole can be left and resumed without losing the thread.

## Phase 3 — Interest Engine (Nov 2026–Jan 2027) · momentum

The motivation loop: learn the language through what he loves.

- F-301 Channels: art & culture, symbolism/metaphysics, history,
  politics & economics (China-in-the-world), modern life
- F-302 URL ingest (paste a link → extracted text becomes a lesson)
- F-303 AI news digest (current events glossed to his level)
- F-304 Weekly synthesis story (AI narrates the week's words)
- F-305 Interest profile (prompts tuned to his lenses)

**Exit criteria:** ≥ 30% of new vocabulary enters via channels/ingest; a
weekly story reliably uses the week's words; digest is level-appropriate.

## Phase 4 — Speak (Jan–Mar 2027) · production

From reading to speaking, timed before HSK2 consolidation.

- F-401 AI role-play dialogues (scenario-based, turn-by-turn, suggested
  replies, corrections)
- F-402 Tone production feedback (speech recognition, per-syllable check)
- F-403 Native-speed listening ladder (speed presets tied to word maturity)
- F-404 Survival modules 2–4 (food, shopping, transport)
- F-405 HSK2 track

**Exit criteria:** HSK2 word set (~300 words) reviewed; he can complete a
10-turn role-play (ordering food, asking directions) with ≥ 80% tone
accuracy on practiced phrases.

## Phase 5 — Polymath Layer (Mar–Jun 2027) · his edge

The cross-domain payoff: one knowledge graph, many lenses.

- F-501 Knowledge graph (words ↔ concepts ↔ themes) + visualization
- F-502 Cross-domain explainer chains (word → history → politics → art)
- F-503 HSK3 track + grammar system page
- F-504 Weekly essay mode (write short essays, get AI feedback)

**Exit criteria:** HSK3 core (~600 words) reviewed; any studied word can be
explored across ≥ 2 lenses; weekly essays show active HSK2+ production.

## Phase 6 — Immersion Prep (Jun–Sep 2027) · arrival

Turn 13 months of compounding into a ready-to-depart state.

- F-601 XMU/Xiamen pack (campus vocabulary, registration phrases, city
  culture notes)
- F-602 Dictation drills (listen → type pinyin)
- F-603 Mock campus dialogues (enrollment, dorm, cafeteria, bank)
- F-604 iOS parity (review, track lessons, dialogues on the phone)
- F-605 Pre-arrival checklist mode

**Exit criteria:** HSK3 complete with retention ≥ 85%; mock campus
dialogues passed; iOS app usable daily; checklist cleared.

## Cross-cutting (any phase, when needed)

- F-901 Profile/settings storage (quotas, lenses, targets)
- F-902 AI cost guardrails (per-endpoint budget caps)
- F-903 AI model upgrade path (swap provider/model without code changes)
- F-904 Metrics endpoint (retention, spend, activity)

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| ADHD consistency decays after novelty | Streaks, 2-min minimum bar, adaptive daily plan (F-103), dashboard feedback (F-004) |
| AI cost grows with endpoints | Per-endpoint rate limits + budget caps (F-902), cache TTS, reuse sessions |
| FSRS migration breaks existing review flow | Keep API shape (grades unchanged), shadow-run locally, exit criteria gate |
| Speech recognition accuracy on tones | Gate on practiced phrases first; degrade gracefully to self-assessment |
| Scope creep derails the spine | Phase gates: no Phase N+1 feature starts before Phase N exit criteria |

## Cadence note

Each phase ships to the cloud backend (`zhong.rome.markets`) with the local
server mirror kept in parity, per `implementation.md` rollout rules. Repowiki
docs (`.qoder/repowiki/`) are updated whenever phase code lands, per project
conventions.
