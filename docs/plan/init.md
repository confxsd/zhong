# Zhōng 2.0 — Init Doc: A Personal China-Learning Platform

Status: approved direction (Aug 2026) · Scope: docs only for now · Companion docs: `roadmap.md`, `features.md`, `implementation.md`, `xiamen-prep.md`

## 1. What this is

Zhōng (仲) is currently a selection-based Chinese tutor: select text anywhere on
macOS, get an AI lesson, save words, review them with Leitner SRS. It works.

This doc defines the evolution of Zhōng from *tutor* into a **personal
learning platform** — one engineered around a specific learner: high fluid and
verbal intelligence, strong working memory, fast learning skills, ADHD, and
weak long-term memory. The goal is not "more features"; it is a system where
every strength is amplified and the one real weakness is structurally
neutralized.

## 2. Learner profile and its implications

| Trait | Implication for the design |
|---|---|
| High fluid intelligence, conceptual thinker | Dense, multi-layered, *systemic* explanations are fine. Grammar as conceptual structure, not rote rules. Nothing is "dumbed down" — depth is available on demand. |
| High verbal IQ | Reading-led acquisition. Etymology, wordplay, register nuance, precise lexical distinctions. The language is learned *through* text he already finds interesting. |
| Strong working memory | Can hold long sentences and multi-step explanations. Cards and lessons can carry rich context without overwhelming him. |
| Fast encoding, weak long-term retention | Initial learning is easy; retention is not. The app **is** the memory. Every exposure is captured, structured, and re-surfaced on an optimal schedule. Never rely on "I'll remember this". |
| ADHD: hyperfocus + attention volatility | Support deep rabbit holes *and* micro-sessions. Capture-and-return: a rabbit hole can be paused, saved as a trail, and resumed. Sessions of 2–10 minutes. Clear "done" states, streaks, novelty. Long drills and big lists are anti-patterns. |
| Interest-driven (art, symbolism, metaphysics, history, politics/economics, China-in-the-world) | Intrinsic motivation is the fuel. The language is learned *through* these interests, not in parallel to them. Hanzi etymology is a symbolic system — a natural hook for this mind. |

Core insight: **interest is the engine, structure is the rails, spaced
retrieval is the memory.** The app supplies structure (HSK spine, Xiamen
prep track) and memory (FSRS + context-rich review); the learner supplies
momentum (curiosity).

## 3. Language scope (fixed)

- **Standard Mandarin (普通话) only.** No Cantonese, no Hong Kong variants,
  no regional dialects as learning targets.
- **Simplified characters (简体字)**, as used in mainland China and at
  Xiamen University.
- **Pinyin** as the phonetic layer throughout.
- Southern Min / 闽南 / Xiamen culture may appear as *cultural notes* (in
  English or simple standard Mandarin) — never as language content.

## 4. Product vision

Zhōng becomes a three-pillar platform:

1. **Capture** — text from anywhere (existing picker), plus structured
   channels, URL ingest, and news digests. Zero-friction entry.
2. **Teach** — AI lessons with depth layers: quick → standard → deep
   (etymology, symbolism, history, cross-domain links). Concept-first
   grammar. AI role-play dialogues for speaking.
3. **Remember** — a memory spine: FSRS scheduling (replacing Leitner),
   context-linked cards (every word carries the sentence/text where it was
   met), audio cards, streaks and a retention dashboard.

Two learning tracks feed the same memory graph:

- **Interest track (wild)** — art, symbolism, history, politics/economics,
  modern life. Momentum and vocabulary amplification.
- **Xiamen track (structured)** — pinyin/tone bootcamp → HSK1 → HSK2 →
  HSK3 → survival modules → XMU arrival pack, timed for Sep 2027.

The platform's name fits the ambition: 仲 (zhòng, "middle/mediator") —
Zhōng stands between the learner and Chinese culture, and 中 ("middle",
China) sits at the center of the design.

## 5. Design principles

1. **External memory.** The app is the memory. Capture everything; resurface
   it on an optimal schedule.
2. **Retrieval with context.** Cards show the original sentence and source —
   encoding specificity beats bare word lists for weak long-term memory.
3. **Desirable difficulty, adapted.** FSRS tunes intervals per word from
   real review history. Fewer, better reviews than fixed Leitner boxes.
4. **Interest-led encoding.** New material enters through what he loves.
   Emotion and depth of processing are the strongest encoding aids he has.
5. **Depth on demand.** Three layers per lesson. High working memory can go
   deep (etymology, symbolism, history); a distracted day stays shallow.
6. **Micro-sessions, macro-consistency.** 2–10 minute sessions, streaks,
   and a daily plan that shrinks on busy days. Consistency, not intensity.
7. **Interleaving.** Curriculum words, interest words, listening, and tone
   drills mix in one queue — mixing boosts long-term transfer.
8. **Multi-channel.** Visual (hanzi), auditory (TTS tones), and narrative
   (weekly synthesis stories) encoding of the same material.
9. **Structure in the background.** The HSK/Xiamen spine runs quietly; it
   never demands motivation.
10. **Metacognition visible.** Retention %, streak, forecasted workload —
    a dashboard that feeds the dopamine loop and prevents silent decay.

## 6. Success metrics

- **Retention**: FSRS predicted retention ≥ 85% on the review queue.
- **Coverage**: HSK1 by Dec 2026, HSK2 by Mar 2027, HSK3 by Aug 2027
  (~600+ words with reviews, per `xiamen-prep.md`).
- **Consistency**: ≥ 5 review days/week, 10–25 min/day (ADHD-realistic).
- **Interest share**: ≥ 30% of vocabulary comes from interest-track texts
  by mid-course.
- **Readiness**: by Aug 2027 he can order food, handle campus admin, hold
  a 10-turn simple conversation, and read short graded texts — mockable
  via in-app dialogues before departure.

## 7. Non-goals

- No Cantonese/HK content, no traditional characters (see scope).
- No handwriting-first curriculum (optional stroke-order layer only).
- No 3-hour study blocks; no "power through boring" pedagogy.
- No feature creep beyond the three pillars until the memory spine is
  proven (exit criteria in `roadmap.md`).
