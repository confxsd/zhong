import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ChevronDown, RotateCcw, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import SpeakButton from "../components/SpeakButton";
import { useToast } from "../components/Toast";
import { daysLabel, timeAgo } from "../lib/format";
import type { VocabStatus, VocabWord } from "../types";

const FILTERS: { key: VocabStatus | "all"; label: string; cn: string }[] = [
  { key: "all", label: "All", cn: "全部" },
  { key: "new", label: "New", cn: "新" },
  { key: "learning", label: "Learning", cn: "学习" },
  { key: "known", label: "Known", cn: "熟悉" },
];

const STATUS_META: Record<VocabStatus, { cn: string; cls: string }> = {
  new: { cn: "新", cls: "bg-amber-soft text-amber" },
  learning: { cn: "学", cls: "bg-accent-soft text-accent" },
  known: { cn: "熟", cls: "bg-jade-soft text-jade" },
};

function StatusBadge({ status }: { status: VocabStatus }) {
  const meta = STATUS_META[status];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}>{meta.cn}</span>;
}

export default function LibraryPage() {
  const [filter, setFilter] = useState<VocabStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<number>>(new Set());
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["vocab", filter, search],
    queryFn: () => api.vocab(filter, search),
    placeholderData: (prev) => prev,
  });

  const deleteWord = useMutation({
    mutationFn: (id: number) => api.deleteVocab(id),
    onSuccess: (_, id) => {
      setDeletedIds((s) => new Set(s).add(id));
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast("Removed from library");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const rows = useMemo(() => (data ?? []).filter((w) => !deletedIds.has(w.id)), [data, deletedIds]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, new: 0, learning: 0, known: 0 };
    for (const w of data ?? []) c[w.status] = (c[w.status] ?? 0) + 1;
    c.all = (data ?? []).length;
    return c;
  }, [data]);

  return (
    <div>
      <header className="mb-5">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight md:text-3xl">
          Library <span className="font-cn text-accent">词库</span>
          <span className="mt-1 rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-soft">{counts.all}</span>
        </h1>
        <p className="mt-1 text-sm text-soft">Every word Zhong has taught you. See it again in Review when it's due.</p>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-soft" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hanzi, pinyin, or meaning…"
            className="w-full rounded-xl bg-surface py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-soft/60 focus:bg-surface-strong"
          />
        </div>
        <div className="flex rounded-xl bg-surface p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-[10px] px-3 py-1.5 text-sm font-medium transition ${
                filter === f.key ? "bg-accent text-white" : "text-soft hover:text-ink"
              }`}
            >
              {f.label}
              <span className={`ml-1 text-[11px] ${filter === f.key ? "text-white/70" : "text-soft/60"}`}>{counts[f.key] ?? 0}</span>
            </button>
          ))}
        </div>
      </div>

      {isLoading && <div className="py-16 text-center text-sm text-soft">Loading…</div>}

      {!isLoading && rows.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <BookOpen size={32} className="text-soft/50" />
          <div className="text-sm text-soft">
            {search || filter !== "all" ? "Nothing matches — try a different filter." : "No words yet. Study a sentence and your vocabulary grows here automatically."}
          </div>
          <Link to="/" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong">
            Study something →
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((w: VocabWord) => {
          const open = expanded === w.id;
          const dueSoon = w.next_review_at && new Date(w.next_review_at).getTime() <= Date.now();
          return (
            <div key={w.id} className="rounded-2xl bg-paper transition">
              <div className="flex items-center gap-3 px-4 py-3.5">
                <button onClick={() => setExpanded(open ? null : w.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="font-cn text-xl font-bold leading-none">{w.hanzi}</span>
                  <span className="hidden w-24 shrink-0 text-xs text-soft sm:block">{w.pinyin}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-soft">{w.meaning}</span>
                </button>
                <StatusBadge status={w.status} />
                <SpeakButton text={w.hanzi} title={`Listen to ${w.hanzi}`} className="h-8 w-8" />
                <span className={`hidden w-20 shrink-0 text-right text-xs ${dueSoon ? "font-semibold text-accent" : "text-soft"} sm:block`}>
                  {dueSoon ? "due now" : `next ${timeAgo(w.next_review_at)}`}
                </span>
                <Link
                  to="/review"
                  title="Review now"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-soft transition hover:bg-accent-soft hover:text-accent"
                >
                  <RotateCcw size={15} />
                </Link>
                <button
                  onClick={() => deleteWord.mutate(w.id)}
                  title="Delete"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-soft transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
                >
                  <Trash2 size={15} />
                </button>
                <ChevronDown size={15} className={`shrink-0 text-soft transition-transform ${open ? "rotate-180" : ""}`} />
              </div>

              {open && (
                <div className="anim-rise px-3 pb-3">
                  <div className="grid gap-3 rounded-2xl bg-surface p-4 text-sm sm:grid-cols-2">
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-soft">Pinyin</div>
                      <div className="mt-1">{w.pinyin || "—"}</div>
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-soft">Meaning</div>
                      <div className="mt-1">{w.meaning}</div>
                    </div>
                    {w.example && (
                      <div className="sm:col-span-2">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-soft">Example</span>
                          <SpeakButton text={w.example} title="Listen to example" className="h-6 w-6" size={12} />
                        </div>
                        <div className="font-cn-sans">{w.example}</div>
                        {w.example_trans && <div className="mt-0.5 text-soft">{w.example_trans}</div>}
                      </div>
                    )}
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-soft">Review stage</div>
                      <div className="mt-1">
                        box {w.box}/7 · {w.review_count} reviews · {w.correct_count} correct
                        {w.next_review_at ? ` · next in ${daysLabel(Math.max(0, Math.ceil((new Date(w.next_review_at).getTime() - Date.now()) / 86400000)))}` : ""}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-soft">Added</div>
                      <div className="mt-1">{timeAgo(w.created_at)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}