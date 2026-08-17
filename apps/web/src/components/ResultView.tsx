import { AlertCircle, BookMarked, Check } from "lucide-react";
import { type ReactNode, useState } from "react";
import { NavLink } from "react-router-dom";
import type { Breakdown, Segments, SessionDetail, TeachResult, VocabResult } from "../types";
import SpeakButton from "./SpeakButton";
import SpeakText from "./SpeakText";

function Card({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="anim-rise rounded-3xl bg-paper p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-2">
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
      className="rounded-lg px-2 py-1 text-xs font-medium text-soft transition hover:bg-surface hover:text-ink"
    >
      {copied ? <Check size={14} className="text-jade" /> : label}
    </button>
  );
}

function VocabChip({ v }: { v: VocabResult }) {
  return (
    <div className="anim-pop rounded-2xl bg-jade-soft p-4">
      <div className="flex items-center gap-2">
        <SpeakButton text={v.hanzi} title={`Listen to ${v.hanzi}`} className="h-7 w-7 bg-paper/60 hover:bg-paper" size={13} />
        <span className="font-cn text-xl font-bold leading-none">{v.hanzi}</span>
        <span className="text-xs font-medium text-jade">{v.pinyin}</span>
      </div>
      <div className="mt-1.5 text-[13px] text-ink/80">{v.meaning}</div>
      {v.example && (
        <div className="mt-2.5 flex items-start gap-2 rounded-xl bg-paper/70 p-2.5 text-xs leading-relaxed">
          <SpeakButton text={v.example} title="Listen to example" className="h-6 w-6" size={12} />
          <div>
            <span className="font-cn-sans text-[13px] font-medium">{v.example}</span>
            {v.example_translation && <div className="mt-0.5 text-soft">{v.example_translation}</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function BreakdownTile({ item }: { item: Breakdown }) {
  return (
    <div className="relative rounded-2xl bg-surface p-3.5 transition hover:bg-surface-strong">
      <SpeakButton text={item.char} title={`Listen to ${item.char}`} className="absolute right-2 top-2 h-7 w-7" size={13} />
      <div className="font-cn text-3xl font-bold leading-none">{item.char}</div>
      <div className="mt-2 text-xs font-semibold text-accent">{item.pinyin}</div>
      <div className="mt-1 text-[13px] leading-snug">{item.meaning}</div>
      {item.note && <div className="mt-2 text-xs leading-relaxed text-soft">{item.note}</div>}
    </div>
  );
}

function SegmentRow({ seg }: { seg: Segments }) {
  return (
    <div className="rounded-2xl bg-surface px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
        <SpeakButton text={seg.text} title={`Listen to ${seg.text}`} className="h-7 w-7" size={13} />
        <div className="flex flex-wrap gap-x-0.5">
          {Array.from(seg.text).map((ch, i) => (
            <SpeakText key={i} text={ch} className="px-1 py-0.5 font-cn text-lg font-semibold" />
          ))}
        </div>
        <span className="text-xs font-medium text-accent">{seg.pinyin}</span>
        <span className="min-w-0 flex-1 text-right text-sm text-soft">{seg.literal}</span>
      </div>
    </div>
  );
}

export default function ResultView({ result }: { result: TeachResult | SessionDetail }) {
  const vocab = "vocab" in result ? result.vocab : [];
  const text = "text" in result ? result.text : result.input_text;
  const hasChinese = /[\u4e00-\u9fff]/.test(text);
  const displayText = hasChinese ? text : result.translation;
  const meaningText = hasChinese ? result.translation : text;

  return (
    <div className="space-y-4">
      <Card
        title={hasChinese ? "Translation · 翻译" : "How to say it · 怎么说"}
        action={
          <div className="flex items-center gap-1">
            <SpeakButton text={displayText} title="Listen" />
            <SpeakButton text={displayText} rate={0.65} title="Listen slowly" className="h-7 w-7" size={13} />
            <CopyButton text={`${displayText}\n${result.pinyin}\n${meaningText}`} label="copy all" />
          </div>
        }
      >
        {hasChinese ? (
          <p className="font-cn text-2xl font-semibold leading-relaxed md:text-3xl">
            {Array.from(displayText).map((ch, i) => (
              <SpeakText key={i} text={ch} className="px-0.5 py-0.5" />
            ))}
          </p>
        ) : (
          <p className="font-cn text-2xl font-semibold leading-relaxed md:text-3xl">{displayText}</p>
        )}
        <p className="mt-2 text-[15px] font-medium text-accent">{result.pinyin}</p>
        <p className="mt-4 text-[15px] leading-relaxed">{meaningText}</p>
      </Card>

      {result.recognized.length > 0 && (
        <Card title="Already in your memory · 你学过">
          <div className="flex flex-wrap gap-2">
            {result.recognized.map((w) => (
              <span key={w.hanzi} className="flex items-center gap-1.5 rounded-full bg-amber-soft px-3 py-1 text-sm">
                <BookMarked size={14} className="text-amber" />
                <SpeakText text={w.hanzi} className="font-cn font-semibold" />
                <span className="text-soft">{w.meaning}</span>
              </span>
            ))}
          </div>
          <p className="mt-2.5 text-xs text-soft">Words you already know that appear here — the tutor built on these.</p>
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
          <ul className="space-y-3.5">
            {result.grammar.map((g, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-2 flex h-2 w-2 shrink-0 rounded-full bg-accent" />
                <div>
                  <div className="text-sm font-bold">{g.point}</div>
                  <div className="mt-0.5 text-[15px] leading-relaxed text-soft">{g.explanation}</div>
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
