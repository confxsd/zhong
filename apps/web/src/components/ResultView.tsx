import { AlertCircle, BookMarked, Check, ChevronDown } from "lucide-react";
import { type ComponentType, type ReactNode, useState } from "react";
import { NavLink } from "react-router-dom";
import type { Breakdown, Segments, SessionDetail, TeachResult, VocabResult } from "../types";

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="anim-rise rounded-2xl border border-line bg-paper p-5 shadow-sm shadow-black/5 dark:shadow-black/25">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wider text-soft">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function CopyButton({ text, label = "copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="rounded-md px-2 py-1 text-xs font-medium text-soft transition hover:bg-surface hover:text-ink"
    >
      {copied ? <Check size={14} className="text-jade" /> : label}
    </button>
  );
}

function VocabChip({ v }: { v: VocabResult }) {
  return (
    <div className="anim-pop rounded-xl border border-jade/30 bg-jade-soft px-3 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-cn text-lg font-bold">{v.hanzi}</span>
        <span className="text-xs text-soft">{v.pinyin}</span>
      </div>
      <div className="mt-0.5 text-xs text-ink/80">{v.meaning}</div>
      {v.example && (
        <div className="mt-1.5 border-t border-jade/15 pt-1.5 text-xs leading-relaxed">
          <span className="font-cn-sans text-[13px] font-medium">{v.example}</span>
          {v.example_translation && <div className="text-soft">{v.example_translation}</div>}
        </div>
      )}
    </div>
  );
}

function BreakdownTile({ item, icon: _icon }: { item: Breakdown; icon?: ComponentType<{ size?: number }> }) {
  return (
    <div className="rounded-xl border border-line bg-paper p-3 transition hover:border-accent/40 hover:shadow-md hover:shadow-black/5 dark:hover:shadow-black/30">
      <div className="font-cn text-2xl font-bold leading-none">{item.char}</div>
      <div className="mt-1.5 text-xs font-medium text-accent">{item.pinyin}</div>
      <div className="mt-0.5 text-[13px] leading-snug">{item.meaning}</div>
      {item.note && <div className="mt-1.5 border-t border-line pt-1.5 text-xs leading-relaxed text-soft">{item.note}</div>}
    </div>
  );
}

function SegmentRow({ seg }: { seg: Segments }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-surface"
      >
        <span className="font-cn text-lg font-semibold">{seg.text}</span>
        <span className="text-xs text-soft">{seg.pinyin}</span>
        <span className="flex-1 text-sm text-soft">{seg.literal}</span>
        <ChevronDown size={15} className={`text-soft transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}

export default function ResultView({ result }: { result: TeachResult | SessionDetail }) {
  const vocab = "vocab" in result ? result.vocab : [];
  const text = "text" in result ? result.text : result.input_text;

  return (
    <div className="space-y-4">
      <Card
        title="Translation · 翻译"
        action={<CopyButton text={`${text}\n${result.pinyin}\n${result.translation}`} label="copy all" />}
      >
        <p className="font-cn text-xl font-semibold leading-relaxed md:text-2xl">{text}</p>
        <p className="mt-1.5 text-sm text-soft">{result.pinyin}</p>
        <p className="mt-3 border-t border-line pt-3 text-[15px] leading-relaxed">{result.translation}</p>
      </Card>

      {result.recognized.length > 0 && (
        <Card title="Already in your memory · 你学过">
          <div className="flex flex-wrap gap-2">
            {result.recognized.map((w) => (
              <span key={w.hanzi} className="flex items-center gap-1.5 rounded-full border border-amber/40 bg-amber-soft px-3 py-1 text-sm">
                <BookMarked size={14} className="text-amber" />
                <span className="font-cn font-semibold">{w.hanzi}</span>
                <span className="text-soft">{w.meaning}</span>
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-soft">Words you already know that appear here — the tutor built on these.</p>
        </Card>
      )}

      {result.segments.length > 0 && (
        <Card title="Chunk by chunk · 分句" action={<CopyButton text={result.segments.map((s) => `${s.text} — ${s.literal}`).join("\n")} />}>
          <div className="space-y-2">
            {result.segments.map((seg, i) => (
              <SegmentRow key={i} seg={seg} />
            ))}
          </div>
        </Card>
      )}

      {result.breakdown.length > 0 && (
        <Card title="Characters · 拆字" action={<CopyButton text={result.breakdown.map((b) => `${b.char} ${b.pinyin} — ${b.meaning}`).join("\n")} />}>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {result.breakdown.map((b, i) => (
              <BreakdownTile key={i} item={b} />
            ))}
          </div>
        </Card>
      )}

      {result.grammar.length > 0 && (
        <Card title="Grammar · 语法" action={<CopyButton text={result.grammar.map((g) => `${g.point}: ${g.explanation}`).join("\n")} />}>
          <ul className="space-y-3">
            {result.grammar.map((g, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-1 flex h-2 w-2 shrink-0 rounded-full bg-accent" />
                <div>
                  <div className="text-sm font-bold">{g.point}</div>
                  <div className="mt-0.5 text-sm leading-relaxed text-soft">{g.explanation}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {result.notes.length > 0 && (
        <Card title="Things to think about · 延伸">
          <ul className="space-y-2.5">
            {result.notes.map((n, i) => (
              <li key={i} className="flex gap-2.5 text-sm leading-relaxed">
                <AlertCircle size={15} className="mt-0.5 shrink-0 text-accent" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {vocab.length > 0 && (
        <Card
          title={`Saved to your library · 生词 (${vocab.length})`}
          action={
            <NavLink to="/library" className="text-xs font-semibold text-accent hover:underline">
              open library →
            </NavLink>
          }
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {vocab.map((v, i) => (
              <VocabChip key={`${v.hanzi}-${i}`} v={v} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}