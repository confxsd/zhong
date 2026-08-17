import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Flame,
  GraduationCap,
  Map,
  RotateCcw,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import ProviderBanner from "../components/ProviderBanner";
import { chineseDate, timeAgo } from "../lib/format";
import type { Plan } from "../types";

function Ring({ value, size = 56, stroke = 6, label }: { value: number; size?: number; stroke?: number; label: string }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, Math.max(0, value));
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-jade)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - pct)}
          className="transition-all duration-700"
        />
      </svg>
      <span className="text-xs font-bold text-ink">{Math.round(pct * 100)}%</span>
      <span className="text-[10px] uppercase tracking-wider text-soft">{label}</span>
    </div>
  );
}

function StatCard({ icon, value, label, to, tone = "accent" }: { icon: React.ReactNode; value: string; label: string; to: string; tone?: "accent" | "jade" | "amber" }) {
  const tones = {
    accent: "bg-accent-soft text-accent",
    jade: "bg-jade-soft text-jade",
    amber: "bg-amber-soft text-amber",
  } as const;
  return (
    <Link to={to} className="card-lift anim-rise flex items-center gap-4 rounded-3xl bg-paper p-5">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tones[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-extrabold leading-none tracking-tight">{value}</div>
        <div className="mt-1 truncate text-xs font-medium text-soft">{label}</div>
      </div>
      <ArrowRight size={16} className="ml-auto shrink-0 text-soft/50" />
    </Link>
  );
}

function TrackCard({ plan }: { plan: Plan }) {
  const track = plan.track;
  if (!track) return null;
  const pct = track.total > 0 ? Math.round((track.started / track.total) * 100) : 0;
  return (
    <section className="anim-rise rounded-3xl bg-paper p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-soft">
          <Map size={15} className="text-accent" /> Curriculum track
        </h3>
        <Link to="/track" className="text-xs font-semibold text-accent hover:underline">
          open track →
        </Link>
      </div>
      <div className="font-cn mb-1 text-xl font-bold">{track.title}</div>
      <div className="mb-2 text-xs text-soft">
        {track.mastered} of {track.total} mastered · aligned with what language schools teach first
      </div>
      <div className="mb-1 h-2.5 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-strong transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <div className="mb-3 flex justify-between text-[11px] font-medium text-soft">
        <span>{pct}% started</span>
        <span className="text-jade">{track.mastered} mastered</span>
      </div>
      {track.nextPreview.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] text-soft">Next up:</span>
          {track.nextPreview.map((w) => (
            <span key={w} className="font-cn flex items-center gap-0.5 rounded-full bg-surface px-2 py-0.5 text-sm font-semibold">
              {w}
            </span>
          ))}
        </div>
      )}
      <Link
        to="/track"
        className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-accent-strong px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
      >
        <Sparkles size={15} /> New lesson · {track.nextCount} words
      </Link>
    </section>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const dueDone = plan.reviewsToday > 0;
  const wordsDone = plan.wordsToday >= plan.newQuota;
  return (
    <section className="anim-rise rounded-3xl bg-paper p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-soft">
        <Target size={15} className="text-accent" /> Today's plan
      </h3>
      <div className="space-y-2.5">
        <Link to="/review" className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 transition hover:bg-surface-strong">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${dueDone ? "bg-jade-soft text-jade" : "bg-accent text-white"}`}>
            {dueDone ? "✓" : "1"}
          </span>
          <span className="flex-1 text-sm font-medium">
            Review due words {plan.due > 0 && <span className="text-accent">({plan.due} waiting)</span>}
          </span>
          {plan.due > 0 ? <ArrowRight size={15} className="text-accent" /> : <Trophy size={15} className="text-amber" />}
        </Link>
        <Link to="/track" className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 transition hover:bg-surface-strong">
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${wordsDone ? "bg-jade-soft text-jade" : "bg-surface-strong text-soft"}`}>
            {wordsDone ? "✓" : "2"}
          </span>
          <span className="flex-1 text-sm font-medium">
            Learn {plan.newQuota} new words {plan.wordsToday > 0 && <span className="text-soft">· {plan.wordsToday} today</span>}
          </span>
          <ArrowRight size={15} className="text-soft" />
        </Link>
        <div className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface-strong text-xs font-bold text-soft">3</span>
          <span className="flex-1 text-sm font-medium text-soft">One tone drill — 2 minutes</span>
          <Link to="/track" className="text-xs font-semibold text-accent hover:underline">
            go →
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const { data: health } = useQuery({ queryKey: ["health"], queryFn: api.health, refetchInterval: 30_000 });
  const { data: plan } = useQuery({ queryKey: ["plan"], queryFn: api.plan, refetchInterval: 30_000 });
  const { data: recent } = useQuery({ queryKey: ["sessions", "recent"], queryFn: () => api.sessions(4), staleTime: 60_000 });

  const stats = health?.stats;
  const retention = stats?.retention ?? 1;

  return (
    <div>
      <ProviderBanner />

      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
            你好！<span className="ml-3 align-middle text-base font-medium text-soft md:text-lg">{chineseDate()}</span>
          </h1>
          <p className="mt-1.5 text-sm text-soft">
            {stats && stats.due > 0
              ? `${stats.due} words are waiting in review. Small step today, deep memory tomorrow.`
              : "All reviews are done. Time to feed the memory something new."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/review"
            className={`flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition ${
              (stats?.due ?? 0) > 0
                ? "bg-gradient-to-r from-accent to-accent-strong text-white shadow-md hover:brightness-110"
                : "bg-surface text-soft hover:bg-surface-strong hover:text-ink"
            }`}
          >
            <RotateCcw size={15} />
            Review {stats && stats.due > 0 && <span className="rounded-full bg-white/25 px-1.5 text-xs">{stats.due}</span>}
          </Link>
          <Link
            to="/study"
            className="flex items-center gap-2 rounded-2xl bg-paper px-4 py-2.5 text-sm font-bold shadow-sm transition hover:bg-surface"
          >
            <GraduationCap size={15} className="text-accent" />
            Study
          </Link>
        </div>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Flame size={20} />} value={`${stats?.streak ?? 0}d`} label={`streak${(stats?.streak ?? 0) > 0 ? " — keep burning" : " — review to start"}`} to="/review" tone="accent" />
        <StatCard icon={<BookOpen size={20} />} value={`${stats?.totalVocab ?? "–"}`} label="words in memory" to="/library" tone="jade" />
        <StatCard icon={<Clock size={20} />} value={`${stats?.reviewsToday ?? 0}`} label="reviews today" to="/review" tone="amber" />
      </div>

      <div className="mb-5 grid gap-3 md:grid-cols-3">
        <PlanCard plan={plan ?? { due: 0, reviewsToday: 0, streak: 0, retention: 1, newQuota: 8, wordsToday: 0, track: null }} />
        <TrackCard plan={plan ?? { due: 0, reviewsToday: 0, streak: 0, retention: 1, newQuota: 8, wordsToday: 0, track: null }} />
        <section className="anim-rise flex items-center justify-center gap-6 rounded-3xl bg-paper p-5">
          <Ring value={retention} label="retention" />
          <div className="text-sm leading-relaxed text-soft">
            <div className="font-bold text-ink">Memory forecast</div>
            Your predicted chance of remembering the average word right now. FSRS tunes every card's schedule to keep this high — your only job is showing up.
          </div>
        </section>
      </div>

      {recent && recent.length > 0 && (
        <section className="anim-rise">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-soft">
            <Clock size={15} /> Recent lessons
          </h2>
          <div className="space-y-2">
            {recent.map((s) => (
              <Link key={s.id} to={`/history/${s.id}`} className="group flex items-center gap-4 rounded-2xl bg-paper px-4 py-3.5 transition hover:bg-surface">
                <span className="font-cn flex-1 truncate text-[15px] font-medium">{s.input_text}</span>
                <span className="hidden max-w-56 truncate text-sm text-soft sm:block">{s.translation}</span>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] text-soft">
                  <Flame size={11} className="text-accent" /> {s.vocab_count}
                </span>
                <span className="w-14 shrink-0 text-right text-xs text-soft">{timeAgo(s.created_at)}</span>
              </Link>
            ))}
          </div>
          <div className="mt-2 text-right">
            <Link to="/history" className="text-xs font-semibold text-accent hover:underline">
              view all history →
            </Link>
          </div>
        </section>
      )}

      {stats && stats.totalVocab > 0 && stats.due === 0 && (
        <section className="anim-rise mt-6 flex flex-col items-center gap-2 rounded-3xl bg-jade-soft p-8 text-center">
          <Trophy size={28} className="text-jade" />
          <div className="font-bold text-jade">All caught up — 复习完了!</div>
          <p className="text-sm text-soft">Every word is where it should be in memory. New lessons will queue tomorrow's reviews automatically.</p>
          <Link to="/study" className="mt-2 rounded-2xl bg-jade px-4 py-2.5 text-sm font-semibold text-white transition hover:brightness-110">
            Learn something new →
          </Link>
        </section>
      )}
    </div>
  );
}
