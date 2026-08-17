# Zhōng 2.0 — Feature List

Priority: **P0** = load-bearing (phase exit criteria depend on it) · **P1** =
high value · **P2** = nice-to-have. Effort: S (≤1 day), M (2–4 days), L (1–2
weeks), XL (>2 weeks). "Serves" names the learner trait from `init.md` §2.

## Memory Spine

### F-001 · FSRS engine (replaces Leitner) — P0, M · Phase 0
Adaptive spaced repetition: per-word difficulty/stability learned from real
review history, instead of fixed box intervals.
- **Serves:** low long-term memory, ADHD (fewer wasted reviews).
- **Acceptance:** existing `again/hard/good/easy` API unchanged; intervals
  come from FSRS card state; review history is preserved and used; unit
  tests cover scheduling edge cases (first review, lapse, mature card).

### F-002 · Context-linked review cards — P0, M · Phase 0
Every card shows the original sentence (and a link to the source session)
where the word was first met, with audio.
- **Serves:** weak retention (encoding specificity), verbal IQ.
- **Acceptance:** cards fetched via `session_vocab` join; at least one
  context sentence rendered with TTS button; works for old vocab too
  (example sentence fallback).

### F-003 · Review modes — P0, M · Phase 0
Four card formats in one queue: reading (hanzi → meaning), listening
(audio → meaning), production (meaning → type pinyin), tone ID (audio →
pick tone). Interleaved by default.
- **Serves:** multi-channel encoding; tone accuracy for beginners.
- **Acceptance:** mode stored per card per review; tone ID uses cached TTS;
  pinyin typing graded with tolerant comparison (spaces, case).

### F-004 · Streaks + retention dashboard — P0, M · Phase 0
Streak counter, retention %, due-forecast, and weekly activity in the
sidebar/home.
- **Serves:** ADHD dopamine loop, metacognition.
- **Acceptance:** derived from `review_log` + study log; streak tolerates
  a configurable 1-day grace; dashboard loads in the same request as stats.

### F-006 · Micro-session framing — P0, S · Phase 0
Review queue chunked into batches of ~10 with live progress, celebratory
"done" state, and a clear 2-minute minimum entry point.
- **Serves:** ADHD attention volatility.
- **Acceptance:** partial completion of a queue persists nothing stale;
  "done" state shows session stats (already exists — extended).

## Foundations

### F-101 · Pinyin & tone bootcamp — P0, L · Phase 1
Systematic drill: syllable tables, initial/final chart, 4 tones + neutral,
tone-pair listening drills, typing practice.
- **Serves:** absolute beginner; tone mastery compounds everything later.
- **Acceptance:** drill generator produces syllables/words at the current
  track level; tone ID accuracy tracked per syllable; bootcamp completes
  when ≥ 90% accuracy over 3 consecutive sessions.

### F-102 · HSK1 structured track — P0, L · Phase 1
HSK1 word/grammar lists as an ordered track; AI "daily lesson" teaches
5–8 new words inside a story, reusing known words.
- **Serves:** structure in the background (principle 9).
- **Acceptance:** track progresses sequentially; every new word enters the
  same vocab table and FSRS queue; lessons dedupe against known words.

### F-103 · Daily plan (adaptive quota) — P0, M · Phase 1
Daily targets: N new words + due reviews + 1 drill. Quota shrinks
automatically when backlog or retention drops.
- **Serves:** ADHD safety valve; consistency over intensity.
- **Acceptance:** plan endpoint returns today's set; quota logic responds
  to review backlog and predicted retention.

### F-104 · Track progress + badges — P1, S · Phase 1
Visual progress per track, completion badges, next-lesson shortcut.
- **Serves:** dopamine loop.
- **Acceptance:** progress persisted per track item; badge unlocks stored.

### F-105 · Survival module 1: people & campus — P0, M · Phase 1
Greetings, self-intro, classroom basics, meeting classmates; AI lessons in
dialogue form.
- **Serves:** Xiamen prep practicality.
- **Acceptance:** module yields reviewable words + a mini role-play.

## Depth Engine

### F-201 · Etymology layer — P0, L · Phase 2
Per-character: component breakdown, radical meaning, origin/evolution note
(oracle-bronze → modern where well attested), mnemonic story.
- **Serves:** symbolic/metaphysical interest; verbal IQ; deep encoding.
- **Acceptance:** AI schema v2 returns components + etymology; rendered in
  ResultView; stored per session (replayed in history).

### F-202 · Depth-on-demand UI — P0, M · Phase 2
Each lesson has three layers: quick (translation + key words), standard
(today's view), deep (etymology, links, cultural/historical notes).
- **Serves:** working memory vs attention volatility trade-off.
- **Acceptance:** layers expandable in place; deep layer requests data
  lazily; choice remembered per session.

### F-203 · Concept library — P1, M · Phase 2
Grammar points persist as reusable concepts (e.g. `ba-structure`, `了`),
linked to words/sessions; a concepts page groups them by system.
- **Serves:** conceptual thinker; avoids re-explaining.
- **Acceptance:** teach output emits concept slugs; existing concepts are
  referenced (not re-taught); concepts searchable.

### F-204 · Association network — P1, M · Phase 2
Semantic edges between words: synonyms, antonyms, radical families,
collocations, theme clusters.
- **Serves:** network memory (stronger for concept-driven learners).
- **Acceptance:** links stored per vocab pair with relation type; surfaced
  on cards and word pages; AI proposes links during teaching.

### F-205 · Character graph visualization — P2, M · Phase 2
Simple SVG graph: word → components → radical family; click-through.
- **Serves:** visual/symbolic cognition.
- **Acceptance:** renders for any studied character with ≥ 2 components;
  responsive; no layout library dependency required.

### F-206 · Rabbit-hole trails — P1, M · Phase 2
"Explore deeper" on any word/concept starts an AI chain (etymology →
culture → history → related words). Trails are saved and resumable.
- **Serves:** hyperfocus + capture-and-return.
- **Acceptance:** trail persists as ordered steps; resume lands exactly
  where left off; each step's words enter the vocab pipeline.

## Interest Engine

### F-301 · Channels — P0, L · Phase 3
Five curated channels of Chinese text: art & culture, symbolism &
metaphysics, history, politics & economics (China-in-the-world), modern
life. Each item becomes a one-tap lesson.
- **Serves:** interest-led encoding (the fuel).
- **Acceptance:** channel items stored server-side with level tags;
  curated + AI-suggested mix; taught through the existing pipeline.

### F-302 · URL ingest — P1, M · Phase 3
Paste a URL → server extracts main text → lesson. Works with the picker as
a second capture path.
- **Serves:** frictionless capture.
- **Acceptance:** extraction strips boilerplate; failure surfaces a clear
  error; ingested text persisted as a session.

### F-303 · News digest — P1, M · Phase 3
Daily/weekly digest of China-in-the-world headlines glossed to his level
(per sentence: simplified + pinyin + key words).
- **Serves:** interdisciplinary interests; modern Mandarin exposure.
- **Acceptance:** digest generated on demand; each sentence carries
  gloss; words feed the same vocab pipeline.

### F-304 · Weekly synthesis story — P0, M · Phase 3
AI narrates a short story deliberately reusing the week's words (and their
contexts); readable with full teaching layers.
- **Serves:** narrative encoding; weak retention (spaced re-encounter).
- **Acceptance:** generated weekly or on demand; uses ≥ 60% of the week's
  new words; stored as a session; its words marked "re-encountered".

### F-305 · Interest profile — P1, S · Phase 3
Stored lens preferences (symbolism, history, politics, art) that tune all
prompts (examples, analogies, digests).
- **Serves:** personalization, intrinsic motivation.
- **Acceptance:** profile persisted server-side; prompts read it; editable
  in settings.

## Speak

### F-401 · AI role-play dialogues — P0, L · Phase 4
Scenario-based conversations (order food, ask directions, buy a ticket):
AI plays the other side, suggests replies, corrects phrasing, plays audio.
- **Serves:** production skills before Xiamen.
- **Acceptance:** dialogue persisted (replayable); corrections given in
  English + pinyin; 10+ scenarios shipped.

### F-402 · Tone production feedback — P1, L · Phase 4
Speech recognition on practiced phrases; per-syllable tone accuracy
displayed; mispronounced words go back to FSRS.
- **Serves:** tone mastery; ADHD-friendly immediate feedback.
- **Acceptance:** works in Chrome/Safari (MediaRecorder); evaluation on
  server; failed tones re-queue the word.

### F-403 · Listening ladder — P1, S · Phase 4
TTS speed presets (0.5 / 0.65 / 1.0x) per card and per lesson; mature words
auto-suggest native speed.
- **Serves:** gradual listening progression.
- **Acceptance:** rate stored per vocab maturity; one tap toggles.

### F-404 · Survival modules 2–4 — P0, M · Phase 4
Food & ordering, shopping & bargaining, transport & directions.
- **Serves:** Xiamen prep.
- **Acceptance:** same structure as F-105; each ends with a role-play.

### F-405 · HSK2 track — P0, M · Phase 4
Full HSK2 word/grammar set as a track (structure identical to F-102).
- **Serves:** structured spine.
- **Acceptance:** ~300 words total reviewed by phase end.

## Polymath Layer

### F-501 · Knowledge graph + viz — P1, L · Phase 5
Words ↔ concepts ↔ themes edges, visualized; click-through to explainers.
- **Serves:** conceptual thinker; interdisciplinary synthesis.
- **Acceptance:** graph renders ≥ 3 hops; built from existing links
  (F-203/F-204) plus AI-proposed theme edges.

### F-502 · Cross-domain explainer chains — P0, M · Phase 5
For any word/concept: explainers across lenses — etymology, symbolism,
historical reference, political/economic context, artistic tradition.
- **Serves:** his core intellectual identity; deepest encoding.
- **Acceptance:** chains generated per lens; each lens adds at least one
  linkable word/concept.

### F-503 · HSK3 track + grammar system page — P0, L · Phase 5
HSK3 word set; all concepts (F-203) browsable as a structured grammar
system, ordered by track relevance.
- **Serves:** structure in the background.
- **Acceptance:** ~600 words reviewed; grammar system page groups ≥ 40
  concepts.

### F-504 · Weekly essay mode — P1, M · Phase 5
Write 5–10 sentence essays in Chinese on an interest topic; AI feedback
on grammar, word choice, tone accuracy (pinyin annotated).
- **Serves:** verbal IQ; active production.
- **Acceptance:** feedback stored; corrected sentences link back to words.

## Immersion Prep

### F-601 · XMU/Xiamen pack — P0, M · Phase 6
Campus vocabulary (enrollment, dorm, cafeteria, library, bank), Xiamen
city culture notes, in standard Mandarin + English only.
- **Serves:** arrival readiness.
- **Acceptance:** pack delivered as track modules; culture notes comply
  with the Mandarin-only scope.

### F-602 · Dictation drills — P1, M · Phase 6
Listen to a sentence → type pinyin → tolerance-graded.
- **Serves:** listening→writing loop.
- **Acceptance:** reuses F-003 grader; per-sentence accuracy logged.

### F-603 · Mock campus dialogues — P0, M · Phase 6
Scripted scenarios mirroring first weeks at XMU (registration, dorm
check-in, opening a bank account).
- **Serves:** Xiamen prep.
- **Acceptance:** 5+ scenarios; completion recorded in checklist.

### F-604 · iOS parity — P1, XL · Phase 6
Review, track lessons, dialogues, and library on the iPhone app
(extends existing `apps/ios`).
- **Serves:** idle-moment practice (ADHD-friendly).
- **Acceptance:** review + one track + one dialogue usable on device;
  syncs with cloud D1.

### F-605 · Pre-arrival checklist — P1, S · Phase 6
A living checklist: language goals, admin (visa), pack progress, mock
dialogue completions.
- **Serves:** external memory for logistics too.
- **Acceptance:** checklist persists server-side; progress ties to app data.

## Platform Hygiene

### F-901 · Profile/settings — P0, S · Phase 1
Server-side key/value profile (quotas, lenses, targets) replacing
client-only prefs where data matters.
- **Acceptance:** GET/PUT endpoints; used by F-103/F-305.

### F-902 · AI cost guardrails — P0, S · Phase 0
Per-endpoint daily budget counters (reuse rate-limit pattern); graceful
degradation messages when capped.
- **Acceptance:** caps configurable per endpoint; exceeding cap returns a
  friendly 429 with retry hint.

### F-903 · Model swap path — P1, S · Phase 3
Provider/model changeable via env only (already true — verify with new
endpoints and document in `implementation.md`).
- **Acceptance:** all AI endpoints go through the same provider factory.

### F-904 · Metrics endpoint — P1, S · Phase 4
Retention %, AI spend, activity counts for dashboard + personal
introspection.
- **Acceptance:** single endpoint powers dashboard; no PII leaks.
