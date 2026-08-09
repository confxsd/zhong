import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Flame, Sparkles, Wand2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import ResultView from "../components/ResultView";
import { timeAgo } from "../lib/format";
import type { TeachResult, VocabResult } from "../types";
import ProviderBanner from "../components/ProviderBanner";

const SAMPLES = [
  "你去哪儿？",
  "我还没有吃晚饭。",
  "这个字是什么意思？",
  "天气越来越冷了，记得多穿衣服。",
];

function countChinese(text: string): number {
  return (text.match(/[\u4e00-\u9fff]/g) ?? []).length;
}

export default function TranslatePage() {
  const [params] = useSearchParams();
  const [text, setText] = useState(() => params.get("text") ?? "");
  const [result, setResult] = useState<TeachResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const controllerRef = useRef<AbortController | null>(null);

  const cnCount = useMemo(() => countChinese(text), [text]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const translate = useMutation({
    mutationFn: (value: string) => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      return api.translate(value, controller.signal);
    },
    onSuccess: (data) => {
      setResult(data);
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err) => {
      if (err instanceof ApiError) setError(err.message);
      else setError("Something went wrong — try again.");
    },
  });

  const submit = () => {
    const value = text.trim();
    if (!value) {
      setError("Paste or type some Chinese first — even a single word works.");
      return;
    }
    setError(null);
    translate.mutate(value);
  };

  const lastSessions = useQuery({
    queryKey: ["sessions", "recent"],
    queryFn: () => api.sessions(3),
    staleTime: 60_000,
  });

  const newWords = (result?.vocab ?? []).filter((v: VocabResult) => v.saved && !v.alreadyKnown).length;

  return (
    <div>
      <ProviderBanner />

      <header className="mb-5">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Study <span className="font-cn text-accent">学习</span>
        </h1>
        <p className="mt-1 text-sm text-soft">Paste any Chinese text — Zhong explains it like a real tutor, remembers the words, and quizzes you later.</p>
      </header>

      <div className="anim-rise rounded-2xl border border-line bg-paper p-4 shadow-sm shadow-black/5 md:p-5 dark:shadow-black/25">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="例如：我又想起来了，那个地方我们去年去过。"
          rows={5}
          className="w-full resize-y rounded-xl border border-line bg-canvas/60 p-3.5 text-[15px] leading-relaxed outline-none transition placeholder:text-soft/70 focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            onClick={submit}
            disabled={translate.isPending}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent/25 transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
          >
            {translate.isPending ? (
              <Wand2 size={16} className="animate-pulse" />
            ) : (
              <Sparkles size={16} />
            )}
            {translate.isPending ? "Teaching…" : "Teach me"}
          </button>
          <span className="text-xs text-soft">⌘/Ctrl + Enter</span>
          <span className="ml-auto font-mono text-xs text-soft">
            {cnCount} <span className="font-cn">字</span> · {text.length} chars
          </span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          <span className="mr-1 text-xs text-soft">Try:</span>
          {SAMPLES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setText(s);
                inputRef.current?.focus();
              }}
              className="font-cn rounded-full border border-line bg-canvas/50 px-3 py-1 text-sm text-soft transition hover:border-accent/50 hover:text-ink"
            >
              {s}
            </button>
          ))}
        </div>

        {error && (
          <div className="anim-pop mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
            {error}
          </div>
        )}
      </div>

      {translate.isPending && (
        <div className="anim-rise mt-5 rounded-2xl border border-line bg-paper p-6">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <div>
              <div className="text-sm font-semibold">Teaching…</div>
              <div className="text-xs text-soft">Breaking down the characters, grammar, and useful vocabulary.</div>
            </div>
          </div>
        </div>
      )}

      {result && !translate.isPending && (
        <div className="mt-5">
          {cnCount > 0 && cnCount < 60 && (
            <p className="mb-3 text-xs leading-relaxed text-soft">
              {newWords > 0
                ? `Zhong found ${newWords} new word${newWords > 1 ? "s" : ""} and added ${newWords > 1 ? "them" : "it"} to your library below.`
                : "No new words to save this time — everything here was already in your memory or above beginner level."}
              {result.recognized.length > 0 && ` It also spotted ${result.recognized.length} word${result.recognized.length > 1 ? "s" : ""} you've already studied.`}
            </p>
          )}
          <ResultView result={result} />
        </div>
      )}

      {!translate.isPending && !translate.isError && lastSessions.data && lastSessions.data.length > 0 && (
        <section className="anim-rise mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-soft">
            <Clock size={15} /> Recent sessions
          </h2>
          <div className="space-y-2">
            {lastSessions.data.map((s) => (
              <Link
                key={s.id}
                to={`/history/${s.id}`}
                className="group flex items-center gap-4 rounded-xl border border-line bg-paper px-4 py-3 transition hover:border-accent/40 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/25"
              >
                <span className="font-cn flex-1 truncate text-[15px] font-medium">{s.input_text}</span>
                <span className="hidden max-w-56 truncate text-sm text-soft sm:block">{s.translation}</span>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] text-soft">
                  <Flame size={11} className="text-accent" /> {s.vocab_count}
                </span>
                <span className="w-14 shrink-0 text-right text-xs text-soft">{timeAgo(s.created_at)}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}