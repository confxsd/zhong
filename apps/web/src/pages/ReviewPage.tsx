import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Headphones, Keyboard, PartyPopper, RotateCcw, Volume2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import SpeakButton from "../components/SpeakButton";
import { useToast } from "../components/Toast";
import { intervalLabel } from "../lib/format";
import { speak } from "../lib/speech";
import type { Grade, ReviewCard } from "../types";

type Mode = "reading" | "listening" | "typing";

const MODES: { key: Mode; label: string; icon: typeof Headphones }[] = [
  { key: "reading", label: "Read", icon: Volume2 },
  { key: "listening", label: "Listen", icon: Headphones },
  { key: "typing", label: "Type", icon: Keyboard },
];

const GRADES: { key: Grade; label: string; hint: string; tone: "hard" | "neutral" | "good" | "great" }[] = [
  { key: "again", label: "Again", hint: "forgot it", tone: "hard" },
  { key: "hard", label: "Hard", hint: "barely", tone: "neutral" },
  { key: "good", label: "Good", hint: "remembered", tone: "good" },
  { key: "easy", label: "Easy", hint: "too easy", tone: "great" },
];

function stripTones(pinyin: string): string {
  return pinyin
    .toLowerCase()
    .replace(/[āáǎà]/g, "a")
    .replace(/[ēéěè]/g, "e")
    .replace(/[īíǐì]/g, "i")
    .replace(/[ōóǒò]/g, "o")
    .replace(/[ūúǔù]/g, "u")
    .replace(/[ǖǘǚǜü]/g, "u");
}

function normalizePinyin(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "").replace(/[.,?;:!。，？；：！]/g, "");
}

export default function ReviewPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [queue, setQueue] = useState<ReviewCard[] | null>(null);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mode, setMode] = useState<Mode>("reading");
  const [typed, setTyped] = useState("");
  const [typedVerdict, setTypedVerdict] = useState<"exact" | "tones" | "wrong" | null>(null);
  const [history, setHistory] = useState<{ card: ReviewCard; grade: Grade }[]>([]);
  const [sessionStats, setSessionStats] = useState<{ total: number; correct: number; again: number }>({ total: 0, correct: 0, again: 0 });
  const gradingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const due = useQuery({
    queryKey: ["review", "due"],
    queryFn: async () => {
      const res = await api.reviewDue();
      if (!queue && res.cards.length > 0) setQueue(res.cards);
      return res;
    },
    staleTime: 15_000,
  });

  const startQueue = () => {
    if (!due.data || due.data.cards.length === 0) return;
    setQueue(due.data.cards);
    setPosition(0);
    setFlipped(false);
    setHistory([]);
    setSessionStats({ total: due.data.cards.length, correct: 0, again: 0 });
  };

  const grade = useMutation({
    mutationFn: ({ id, g }: { id: number; g: Grade }) => api.reviewGrade(id, g),
    onSuccess: (_, { g }) => {
      setHistory((h) => [...h, { card: queue![position], grade: g }]);
      setSessionStats((s) => ({ ...s, correct: s.correct + (g === "again" ? 0 : 1), again: s.again + (g === "again" ? 1 : 0) }));
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      void queryClient.invalidateQueries({ queryKey: ["health"] });
      void queryClient.invalidateQueries({ queryKey: ["plan"] });
      void queryClient.invalidateQueries({ queryKey: ["review", "due"] });
      void queryClient.invalidateQueries({ queryKey: ["track"] });
      if (position + 1 < queue!.length) {
        setPosition((p) => p + 1);
        setFlipped(false);
        setTyped("");
        setTypedVerdict(null);
      } else {
        setQueue(null);
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) toast(err.message, "error");
    },
  });

  const card: ReviewCard | null = queue ? (queue[position] ?? null) : null;

  useEffect(() => {
    if (queue && card === null) setQueue(null);
  }, [queue, card]);

  useEffect(() => {
    if (mode === "typing" && flipped && card) inputRef.current?.focus();
  }, [mode, flipped, card]);

  const revealed = flipped || typedVerdict === "exact";

  const checkTyped = () => {
    if (!card || !typed.trim()) return;
    const got = normalizePinyin(typed);
    const want = normalizePinyin(card.pinyin);
    if (got === want) {
      setTypedVerdict("exact");
      setFlipped(true);
    } else if (stripTones(got) === stripTones(want)) {
      setTypedVerdict("tones");
    } else {
      setTypedVerdict("wrong");
      setFlipped(true);
    }
  };

  const handleCardClick = () => {
    if (mode === "typing") return;
    if (mode === "listening" && !flipped && card) void speak(card.hanzi);
    setFlipped((f) => !f);
  };

  const previews = card?.previews ?? null;
  const gradeButtonsDisabled = !revealed || grade.isPending;

  const progressPct = queue ? Math.round(((position + 1) / queue.length) * 100) : 0;

  const wordTiles = useMemo(() => {
    if (!queue) return [];
    return queue.map((c, i) => ({ id: c.id, state: i < position ? "done" : i === position ? "current" : "todo" }));
  }, [queue, position]);

  if (!queue) {
    if (due.isLoading) {
      return <div className="py-24 text-center text-sm text-soft">Loading your cards…</div>;
    }
    const finished = history.length > 0;
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center gap-5 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft">
          <RotateCcw size={28} className="text-accent" />
        </div>
        {finished ? (
          <>
            <h1 className="text-2xl font-bold">
              复习完了 <span className="font-cn text-accent">Done!</span>
            </h1>
            <p className="text-soft">
              You reviewed {sessionStats.total} word{sessionStats.total === 1 ? "" : "s"} — remembered{" "}
              <span className="font-semibold text-ink">{sessionStats.correct}</span>, struggled with{" "}
              <span className="font-semibold text-ink">{sessionStats.again}</span>. FSRS moved each one to its optimal next date.
            </p>
            <button onClick={startQueue} className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong">
              Review again <RotateCcw size={15} />
            </button>
          </>
        ) : (
          <>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              All caught up! <PartyPopper size={24} className="text-amber" />
            </h1>
            <p className="text-sm leading-relaxed text-soft">
              {due.data && due.data.remaining > 0
                ? `${due.data.remaining} more card${due.data.remaining === 1 ? " is" : "s are"} waiting — start a session to load them.`
                : "Nothing is due right now. Study something new and words will queue up automatically for tomorrow."}
            </p>
            {due.data && due.data.remaining > 0 && (
              <button onClick={startQueue} className="flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong">
                Start session <ChevronRight size={15} />
              </button>
            )}
            <Link to="/study" className="text-sm font-medium text-accent hover:underline">
              Learn something new →
            </Link>
          </>
        )}
      </div>
    );
  }

  if (!card) return null;

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold">
          Review <span className="font-cn text-accent">复习</span>
        </h1>
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-surface p-1">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                title={m.label}
                className={`flex items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-xs font-semibold transition ${
                  mode === m.key ? "bg-accent text-white" : "text-soft hover:text-ink"
                }`}
              >
                <m.icon size={13} />
                {m.label}
              </button>
            ))}
          </div>
          <div className="text-sm text-soft">
            <span className="font-bold text-ink">{position + 1}</span> / {queue.length}
          </div>
        </div>
      </header>

      <div className="mb-5 flex items-center gap-1">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-accent transition-all duration-300" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="ml-2 flex gap-1">
          {wordTiles.slice(Math.max(0, position - 4), position + 6).map((t, i) => (
            <span
              key={t.id}
              className={`h-1.5 rounded-full transition-all ${
                t.state === "done" ? "w-4 bg-jade" : t.state === "current" ? "w-6 bg-accent" : "w-2 bg-surface-strong"
              }`}
              style={{ opacity: i === 0 ? 0.4 : 1 }}
            />
          ))}
        </div>
      </div>

      {card && (
        <div key={card.id} className="anim-pop" onClick={handleCardClick}>
          <div className="flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-[2rem] bg-paper p-5 text-center transition hover:bg-surface/40 sm:p-8">
            <span className="mb-4 rounded-full bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-soft">
              {mode === "typing"
                ? typedVerdict === null
                  ? "type the pinyin"
                  : typedVerdict === "exact"
                    ? "perfect"
                    : typedVerdict === "tones"
                      ? "tones are off — check them"
                      : "answer"
                : revealed
                  ? "answer"
                  : mode === "listening"
                    ? "tap to listen"
                    : "tap to reveal"}
            </span>

            {mode === "listening" && !revealed ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  void speak(card.hanzi);
                }}
                className="flex h-44 w-44 items-center justify-center rounded-full bg-accent-soft transition hover:scale-105"
              >
                <Volume2 size={72} className="text-accent" />
              </button>
            ) : (
              <div className={`font-cn text-6xl font-bold leading-[1.15] tracking-wide sm:text-7xl md:text-8xl md:leading-none ${revealed ? "text-accent" : ""}`}>{card.hanzi}</div>
            )}

            <div className="mt-8 w-full">
              {mode === "typing" && !revealed ? (
                <div onClick={(e) => e.stopPropagation()} className="mx-auto max-w-xs">
                  <div className="mb-3 text-[15px] font-medium text-soft">{card.meaning}</div>
                  <input
                    ref={inputRef}
                    value={typed}
                    onChange={(e) => setTyped(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") checkTyped();
                    }}
                    placeholder="pinyin, with tones…"
                    className="w-full rounded-xl bg-surface px-4 py-3 text-center text-lg font-semibold outline-none transition placeholder:text-soft/40 focus:bg-surface-strong"
                  />
                  <button
                    onClick={checkTyped}
                    className="mt-3 w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
                  >
                    Check
                  </button>
                  {typedVerdict === "tones" && <div className="mt-2 text-xs text-amber">Almost — your pinyin letters are right but the tones are wrong. The ear needs a second listen.</div>}
                </div>
              ) : revealed ? (
                <div className="anim-rise space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-lg font-semibold text-accent">{card.pinyin}</div>
                    <SpeakButton text={card.hanzi} title={`Listen to ${card.hanzi}`} className="h-7 w-7" size={13} />
                  </div>
                  <div className="text-[15px] text-soft">{card.meaning}</div>
                  {card.context && card.context.input_text !== card.hanzi && (
                    <div className="mx-auto max-w-md rounded-2xl bg-surface px-3.5 py-2.5 text-sm">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-soft">Where you first met it</span>
                        <Link
                          to={`/history/${card.context.session_id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] font-semibold text-accent hover:underline"
                        >
                          source →
                        </Link>
                      </div>
                      <div className="font-cn-sans text-[13px]">{card.context.input_text}</div>
                      {card.context.translation && <div className="mt-0.5 text-xs text-soft">{card.context.translation}</div>}
                    </div>
                  )}
                  {!card.context && card.example && (
                    <div className="mx-auto flex max-w-sm items-center gap-2 rounded-2xl bg-surface px-3.5 py-2.5 text-sm">
                      <span className="font-cn-sans">{card.example}</span>
                      <SpeakButton text={card.example} title="Listen to example" className="h-6 w-6" size={12} />
                      {card.example_trans && <span className="block text-xs text-soft">{card.example_trans}</span>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-soft/60">
                  {mode === "reading" ? "How well do you remember it?" : "Recognize it by sound, then reveal the answer."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`mt-4 grid grid-cols-4 gap-2 transition-opacity ${gradeButtonsDisabled ? "pointer-events-none opacity-40" : "opacity-100"}`}>
        {GRADES.map((g) => (
          <button
            key={g.key}
            onClick={() => {
              if (gradingRef.current) return;
              gradingRef.current = true;
              grade.mutate({ id: card.id, g: g.key }, { onSettled: () => { gradingRef.current = false; } });
            }}
            disabled={grade.isPending}
            className={`rounded-2xl px-2 py-3 text-sm font-semibold transition disabled:opacity-50 ${
              g.tone === "hard"
                ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-950"
                : g.tone === "neutral"
                  ? "bg-surface text-soft hover:bg-surface-strong hover:text-ink"
                  : "bg-jade-soft text-jade hover:bg-jade-strong"
            }`}
          >
            {g.label}
            {previews && (
              <span className="mt-0.5 block text-[10px] font-normal opacity-75">{intervalLabel(previews[g.key].intervalMs)}</span>
            )}
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-soft">
        The intervals are computed by FSRS for your actual memory of this word — no fixed boxes. Forgot it? "Again" brings it back today.
      </p>
    </div>
  );
}
