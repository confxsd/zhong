import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, PartyPopper, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useToast } from "../components/Toast";
import { GRADES, nextIntervalLabel } from "../lib/format";
import type { Grade, ReviewCard } from "../types";

export default function ReviewPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [queue, setQueue] = useState<ReviewCard[] | null>(null);
  const [position, setPosition] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [history, setHistory] = useState<{ card: ReviewCard; grade: Grade }[]>([]);
  const [sessionStats, setSessionStats] = useState<{ total: number; correct: number; again: number }>({ total: 0, correct: 0, again: 0 });

  const due = useQuery({
    queryKey: ["review", "due"],
    queryFn: async () => {
      const res = await api.reviewDue();
      if (!queue) setQueue(res.cards);
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
      void queryClient.invalidateQueries({ queryKey: ["review", "due"] });
      if (position + 1 < queue!.length) {
        setPosition((p) => p + 1);
        setFlipped(false);
      } else {
        setQueue(null);
      }
    },
    onError: (err) => {
      if (err instanceof ApiError) toast(err.message, "error");
    },
  });

  const card: ReviewCard | null = queue ? queue[position] : null;

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
              <span className="font-semibold text-ink">{sessionStats.again}</span>. The ones you forgot will come back sooner.
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
            <Link to="/" className="text-sm font-medium text-accent hover:underline">
              Learn something new →
            </Link>
          </>
        )}
      </div>
    );
  }

  if (card === null) return null;

  return (
    <div className="mx-auto max-w-xl">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">
          Review <span className="font-cn text-accent">复习</span>
        </h1>
        <div className="text-sm text-soft">
          <span className="font-bold text-ink">{position + 1}</span> / {queue.length}
        </div>
      </header>

      <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${((position + 1) / queue.length) * 100}%` }}
        />
      </div>

      {card && (
        <div key={card.id} className="anim-pop" onClick={() => setFlipped((f) => !f)}>
          <div className="flex min-h-80 cursor-pointer flex-col items-center justify-center rounded-[2rem] bg-paper p-8 text-center transition hover:bg-surface/40">
            <span className="mb-4 rounded-full bg-surface px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-soft">
              {flipped ? "answer" : "tap to reveal"}
            </span>

            <div className={`font-cn text-7xl font-bold leading-none tracking-wide md:text-8xl ${flipped ? "text-accent" : ""}`}>{card.hanzi}</div>

            <div className="mt-8 h-24 w-full">
              {flipped ? (
                <div className="anim-rise space-y-2">
                  <div className="text-lg font-semibold text-accent">{card.pinyin}</div>
                  <div className="text-[15px] text-soft">{card.meaning}</div>
                  {card.example && (
                    <div className="mx-auto max-w-sm rounded-2xl bg-surface px-3.5 py-2.5 text-sm">
                      <span className="font-cn-sans">{card.example}</span>
                      {card.example_trans && <span className="block text-xs text-soft">{card.example_trans}</span>}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-soft/60">How well do you remember it?</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`mt-4 grid grid-cols-4 gap-2 transition-opacity ${flipped ? "opacity-100" : "pointer-events-none opacity-40"}`}>
        {GRADES.map((g) => (
          <button
            key={g.key}
            onClick={() => grade.mutate({ id: card.id, g: g.key })}
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
            <span className="mt-0.5 block text-[10px] font-normal opacity-75">{nextIntervalLabel(card.box, g.key)}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 text-center text-xs text-soft">Pick the interval that matches how hard it was. Forgot it? "Again" brings it back tomorrow.</p>
    </div>
  );
}