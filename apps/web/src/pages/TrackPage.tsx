import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, Loader2, Play, Search, Sparkles, Volume2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../api/client";
import ResultView from "../components/ResultView";
import SpeakButton from "../components/SpeakButton";
import { useToast } from "../components/Toast";
import { speak } from "../lib/speech";
import type { TrackGrammarPayload, TrackItem, TrackLessonResult, TrackWordPayload } from "../types";

const STATUS_META = {
  all: { label: "all", cls: "bg-surface text-soft", dot: "bg-surface-strong" },
  done: { label: "mastered", cls: "bg-jade-soft text-jade", dot: "bg-jade" },
  learning: { label: "learning", cls: "bg-amber-soft text-amber", dot: "bg-amber" },
  new: { label: "new", cls: "bg-surface text-soft", dot: "bg-surface-strong" },
} as const;

const TONE_NAMES = ["1st · high", "2nd · rising", "3rd · low dip", "4th · falling", "neutral"];

const TONE_SYLLABLES: { hanzi: string; pinyin: string; tone: number }[] = [
  { hanzi: "妈", pinyin: "mā", tone: 1 },
  { hanzi: "麻", pinyin: "má", tone: 2 },
  { hanzi: "马", pinyin: "mǎ", tone: 3 },
  { hanzi: "骂", pinyin: "mà", tone: 4 },
  { hanzi: "吗", pinyin: "ma", tone: 0 },
  { hanzi: "八", pinyin: "bā", tone: 1 },
  { hanzi: "拔", pinyin: "bá", tone: 2 },
  { hanzi: "把", pinyin: "bǎ", tone: 3 },
  { hanzi: "爸", pinyin: "bà", tone: 4 },
  { hanzi: "一", pinyin: "yī", tone: 1 },
  { hanzi: "姨", pinyin: "yí", tone: 2 },
  { hanzi: "以", pinyin: "yǐ", tone: 3 },
  { hanzi: "意", pinyin: "yì", tone: 4 },
  { hanzi: "屋", pinyin: "wū", tone: 1 },
  { hanzi: "无", pinyin: "wú", tone: 2 },
  { hanzi: "五", pinyin: "wǔ", tone: 3 },
  { hanzi: "物", pinyin: "wù", tone: 4 },
  { hanzi: "他", pinyin: "tā", tone: 1 },
  { hanzi: "你", pinyin: "nǐ", tone: 3 },
  { hanzi: "呢", pinyin: "ne", tone: 0 },
  { hanzi: "好", pinyin: "hǎo", tone: 3 },
  { hanzi: "号", pinyin: "hào", tone: 4 },
  { hanzi: "喝", pinyin: "hē", tone: 1 },
  { hanzi: "和", pinyin: "hé", tone: 2 },
  { hanzi: "贺", pinyin: "hè", tone: 4 },
  { hanzi: "师", pinyin: "shī", tone: 1 },
  { hanzi: "十", pinyin: "shí", tone: 2 },
  { hanzi: "是", pinyin: "shì", tone: 4 },
  { hanzi: "九", pinyin: "jiǔ", tone: 3 },
  { hanzi: "就", pinyin: "jiù", tone: 4 },
  { hanzi: "大", pinyin: "dà", tone: 4 },
  { hanzi: "打", pinyin: "dǎ", tone: 3 },
  { hanzi: "小", pinyin: "xiǎo", tone: 3 },
  { hanzi: "多", pinyin: "duō", tone: 1 },
  { hanzi: "买", pinyin: "mǎi", tone: 3 },
  { hanzi: "卖", pinyin: "mài", tone: 4 },
  { hanzi: "来", pinyin: "lái", tone: 2 },
  { hanzi: "去", pinyin: "qù", tone: 4 },
  { hanzi: "吃", pinyin: "chī", tone: 1 },
  { hanzi: "茶", pinyin: "chá", tone: 2 },
  { hanzi: "水", pinyin: "shuǐ", tone: 3 },
  { hanzi: "睡", pinyin: "shuì", tone: 4 },
  { hanzi: "说", pinyin: "shuō", tone: 1 },
  { hanzi: "书", pinyin: "shū", tone: 1 },
  { hanzi: "数", pinyin: "shù", tone: 4 },
  { hanzi: "属", pinyin: "shǔ", tone: 3 },
  { hanzi: "六", pinyin: "liù", tone: 4 },
  { hanzi: "七", pinyin: "qī", tone: 1 },
  { hanzi: "四", pinyin: "sì", tone: 4 },
  { hanzi: "三", pinyin: "sān", tone: 1 },
  { hanzi: "猫", pinyin: "māo", tone: 1 },
  { hanzi: "狗", pinyin: "gǒu", tone: 3 },
  { hanzi: "不", pinyin: "bù", tone: 4 },
  { hanzi: "看", pinyin: "kàn", tone: 4 },
  { hanzi: "见", pinyin: "jiàn", tone: 4 },
  { hanzi: "听", pinyin: "tīng", tone: 1 },
  { hanzi: "写", pinyin: "xiě", tone: 3 },
  { hanzi: "学", pinyin: "xué", tone: 2 },
  { hanzi: "坐", pinyin: "zuò", tone: 4 },
  { hanzi: "人", pinyin: "rén", tone: 2 },
  { hanzi: "冷", pinyin: "lěng", tone: 3 },
  { hanzi: "热", pinyin: "rè", tone: 4 },
  { hanzi: "钱", pinyin: "qián", tone: 2 },
  { hanzi: "有", pinyin: "yǒu", tone: 3 },
  { hanzi: "门", pinyin: "mén", tone: 2 },
  { hanzi: "们", pinyin: "men", tone: 0 },
  { hanzi: "气", pinyin: "qì", tone: 4 },
  { hanzi: "雨", pinyin: "yǔ", tone: 3 },
  { hanzi: "天", pinyin: "tiān", tone: 1 },
  { hanzi: "月", pinyin: "yuè", tone: 4 },
  { hanzi: "年", pinyin: "nián", tone: 2 },
  { hanzi: "日", pinyin: "rì", tone: 4 },
  { hanzi: "点", pinyin: "diǎn", tone: 3 },
  { hanzi: "分", pinyin: "fēn", tone: 1 },
];

function ToneDrill() {
  const [item, setItem] = useState(() => TONE_SYLLABLES[Math.floor(Math.random() * TONE_SYLLABLES.length)]);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [asked, setAsked] = useState(0);
  const [streak, setStreak] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem("zhong-tone-best") ?? 0));

  const next = () => {
    setItem(TONE_SYLLABLES[Math.floor(Math.random() * TONE_SYLLABLES.length)]);
    setPicked(null);
  };

  const answer = (tone: number) => {
    if (picked !== null) return;
    setPicked(tone);
    const right = tone === item.tone;
    setAsked((a) => a + 1);
    if (right) {
      setScore((s) => s + 1);
      const ns = streak + 1;
      setStreak(ns);
      if (ns > best) {
        setBest(ns);
        localStorage.setItem("zhong-tone-best", String(ns));
      }
    } else {
      setStreak(0);
    }
  };

  const accuracy = asked > 0 ? Math.round((score / asked) * 100) : null;

  return (
    <section className="anim-rise rounded-3xl bg-paper p-5 md:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-soft">
            <Volume2 size={15} className="text-accent" /> Tone drill · 声调
          </h3>
          <p className="mt-1 text-xs text-soft">Hear a syllable, pick its tone. Tones are the difference between 妈 (mom) and 马 (horse).</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold">
          {accuracy !== null && <span className="rounded-full bg-surface px-2.5 py-1 text-soft">{accuracy}% correct</span>}
          {streak > 0 && <span className="rounded-full bg-amber-soft px-2.5 py-1 text-amber">🔥 {streak}</span>}
          {best > 0 && <span className="rounded-full bg-jade-soft px-2.5 py-1 text-jade">best {best}</span>}
        </div>
      </div>

      <div className="flex flex-col items-center gap-5 py-2">
        <button
          onClick={() => void speak(item.hanzi)}
          className="group flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-strong text-white shadow-lg transition hover:scale-105 active:scale-95"
          title="Play again"
        >
          <Play size={34} fill="currentColor" />
        </button>

        {picked !== null && (
          <div className="anim-pop text-center">
            <div className={`font-cn text-3xl font-bold ${picked === item.tone ? "text-jade" : "text-accent"}`}>
              {item.hanzi} <span className="text-lg">{item.pinyin}</span>
            </div>
            <div className="mt-1 text-xs text-soft">
              {picked === item.tone
                ? "Nailed it — the ear is forming."
                : item.tone === 0
                  ? "That was the neutral tone. Listen once more."
                  : `That was the ${["", "1st", "2nd", "3rd", "4th"][item.tone]} tone. Listen once more.`}
            </div>
            <button onClick={next} className="mt-3 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong">
              Next syllable
            </button>
          </div>
        )}

        <div className="grid w-full max-w-md grid-cols-5 gap-2">
          {TONE_NAMES.map((name, i) => {
            const tone = i === 4 ? 0 : i + 1;
            const chosen = picked === tone;
            return (
              <button
                key={name}
                onClick={() => answer(tone)}
                disabled={picked !== null}
                className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-3 text-[11px] font-semibold transition disabled:opacity-70 ${
                  chosen
                    ? tone === item.tone
                      ? "bg-jade-soft text-jade ring-2 ring-jade"
                      : "bg-red-100 text-red-600 ring-2 ring-red-400 dark:bg-red-950/60 dark:text-red-300"
                    : "bg-surface text-soft hover:bg-surface-strong hover:text-ink"
                }`}
              >
                <span className="font-cn text-lg leading-none">{"ˉ ˊ ˇ ˋ ˙".split(" ")[i]}</span>
                {name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function GrammarCard({ item }: { item: TrackItem }) {
  const [open, setOpen] = useState(false);
  const g = item.payload as TrackGrammarPayload;
  const meta = STATUS_META[item.status];
  return (
    <div className="rounded-2xl bg-paper transition">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 px-4 py-3.5 text-left">
        <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dot}`} />
        <span className="flex-1 text-sm font-semibold">{g.title}</span>
        {item.status === "done" && <Check size={15} className="text-jade" />}
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${meta.cls}`}>{meta.label}</span>
        <ChevronDown size={15} className={`shrink-0 text-soft transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="anim-rise space-y-2 px-4 pb-4">
          <p className="text-sm leading-relaxed text-soft">{g.explanation}</p>
          <div className="rounded-xl bg-surface px-3.5 py-2.5 text-sm">
            <div className="font-cn">{g.example}</div>
            <div className="mt-0.5 text-xs text-soft">{g.example_translation}</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TrackPage() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [filter, setFilter] = useState<"all" | "new" | "learning" | "done">("all");
  const [search, setSearch] = useState("");
  const [lesson, setLesson] = useState<TrackLessonResult | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: track, isLoading } = useQuery({
    queryKey: ["track", "hsk1"],
    queryFn: () => api.track("hsk1"),
    refetchInterval: 30_000,
  });

  const lessonMutation = useMutation({
    mutationFn: () => api.trackLesson("hsk1"),
    onSuccess: (data) => {
      setLesson(data);
      void queryClient.invalidateQueries({ queryKey: ["track"] });
      void queryClient.invalidateQueries({ queryKey: ["plan"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      void queryClient.invalidateQueries({ queryKey: ["health"] });
    },
    onError: (err) => {
      if (err instanceof ApiError) toast(err.message, "error");
      else toast("Something went wrong — try again.", "error");
    },
  });

  const wordItems = useMemo(
    () =>
      (track?.items ?? [])
        .filter((it) => it.type === "word")
        .filter((it) => (filter === "all" ? true : it.status === filter))
        .filter((it) => {
          if (!search) return true;
          const w = it.payload as TrackWordPayload;
          const q = search.toLowerCase();
          return w.hanzi.includes(q) || w.pinyin.toLowerCase().includes(q) || w.meaning.toLowerCase().includes(q);
        }),
    [track, filter, search]
  );

  const grammarItems = useMemo(() => (track?.items ?? []).filter((it) => it.type === "grammar"), [track]);

  const pct = track && track.total > 0 ? Math.round((track.started / track.total) * 100) : 0;

  if (isLoading) return <div className="py-24 text-center text-sm text-soft">Loading your curriculum…</div>;

  return (
    <div>
      <header className="mb-5">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight md:text-3xl">
          Curriculum <span className="font-cn text-accent">课程</span>
        </h1>
        <p className="mt-1 text-sm text-soft">The structured path, aligned with what language schools teach first — from pinyin and tones to your first 150 words.</p>
      </header>

      {track && (
        <section className="anim-rise mb-5 rounded-3xl bg-paper p-5 md:p-6">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-cn text-xl font-bold">{track.title}</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-jade-soft px-2.5 py-1 text-jade">{track.mastered} mastered</span>
              <span className="rounded-full bg-amber-soft px-2.5 py-1 text-amber">{track.started - track.mastered} learning</span>
              <span className="rounded-full bg-surface px-2.5 py-1 text-soft">{track.total - track.started} new</span>
            </div>
          </div>
          <p className="mb-3 text-sm text-soft">{track.subtitle}</p>
          <div className="mb-1.5 h-3 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-strong transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="mb-4 flex justify-between text-xs font-medium text-soft">
            <span>{pct}% of the track touched</span>
            <span>{track.total} items</span>
          </div>
          <button
            onClick={() => lessonMutation.mutate()}
            disabled={lessonMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-accent-strong px-5 py-3.5 text-[15px] font-bold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            {lessonMutation.isPending ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
            {lessonMutation.isPending ? "Writing your lesson…" : "Start next lesson · 5 words"}
          </button>
          <p className="mt-2 text-xs text-soft">Each lesson folds the next 5 words into a tiny story — then they enter your review queue automatically.</p>
        </section>
      )}

      {lesson && (
        <section className="mb-6">
          <div className="anim-pop mb-3 rounded-2xl bg-jade-soft p-3 text-sm text-jade">
            <span className="font-bold">Lesson saved.</span> {lesson.vocab.length} words are in your memory queue now — meet them again in Review, and check the track below as they turn green.
          </div>
          <ResultView result={lesson} />
        </section>
      )}

      <ToneDrill />

      <section className="anim-rise mt-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-soft">
            <Search size={15} /> HSK 1 words
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search words…"
              className="w-40 rounded-xl bg-surface px-3 py-2 text-[16px] outline-none transition placeholder:text-soft/60 focus:bg-surface-strong md:text-xs"
            />
            <div className="flex rounded-xl bg-surface p-1">
              {(["all", "new", "learning", "done"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-[10px] px-3 py-1.5 text-xs font-medium transition ${filter === f ? "bg-accent text-white" : "text-soft hover:text-ink"}`}
                >
                  {STATUS_META[f].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {wordItems.map((it) => {
            const w = it.payload as TrackWordPayload;
            const open = expanded === it.id;
            const meta = STATUS_META[it.status];
            return (
              <div key={it.id} className="rounded-2xl bg-paper p-3 transition hover:bg-surface">
                <button onClick={() => setExpanded(open ? null : it.id)} className="flex w-full items-start justify-between gap-2 text-left">
                  <span className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
                    <span className="font-cn text-xl font-bold leading-none">{w.hanzi}</span>
                  </span>
                  {it.status === "done" && <Check size={14} className="text-jade" />}
                </button>
                <div className="mt-1.5 flex items-center justify-between gap-1">
                  <span className="min-w-0 truncate text-xs font-medium text-accent">{w.pinyin}</span>
                  <SpeakButton text={w.hanzi} title={`Listen to ${w.hanzi}`} className="h-7 w-7 shrink-0" size={13} />
                </div>
                <div className="mt-1 truncate text-xs text-soft" title={w.meaning}>
                  {w.meaning}
                </div>
                {open && (
                  <div className="anim-rise mt-2 border-t border-line pt-2 text-xs text-soft">
                    {it.review_count > 0 ? `reviewed ${it.review_count}×` : "not reviewed yet"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="anim-rise mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-soft">
          Grammar system · 语法
        </h2>
        <div className="space-y-2">
          {grammarItems.map((it) => (
            <GrammarCard key={it.id} item={it} />
          ))}
        </div>
      </section>

      <div className="mt-8 rounded-3xl bg-paper p-5 text-center">
        <p className="text-sm text-soft">
          Words mastered here are counted from your reviews — the same memory used everywhere in Zhōng.{" "}
          <Link to="/review" className="font-semibold text-accent hover:underline">
            Go review →
          </Link>
        </p>
      </div>
    </div>
  );
}
