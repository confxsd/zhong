import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, Loader2, Music, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import SpeakButton from "../components/SpeakButton";
import { useToast } from "../components/Toast";

export default function SongDetailPage() {
  const { id } = useParams();
  const songId = Number(id);
  const toast = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<number | null>(null);

  const { data: song, isLoading } = useQuery({
    queryKey: ["song", songId],
    queryFn: () => api.song(songId),
    enabled: Number.isFinite(songId),
  });

  const bulkStudy = useMutation({
    mutationFn: () => api.studySong(songId),
    onSuccess: (data) => {
      queryClient.setQueryData(["song", songId], data.song);
      void queryClient.invalidateQueries({ queryKey: ["songs"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (err) => {
      if (err instanceof ApiError) toast(err.message, "error");
      else toast("Something went wrong — try again.", "error");
    },
  });

  if (isLoading) return <div className="py-24 text-center text-sm text-soft">Loading song…</div>;
  if (!song) return <div className="py-24 text-center text-sm text-soft">Song not found.</div>;

  const pct = song.lineCount > 0 ? Math.round((song.studied / song.lineCount) * 100) : 0;
  const bulkDone = song.studied === song.lineCount && song.lineCount > 0;
  const bulkNewWords = (bulkStudy.data?.vocab ?? []).filter((v) => v.saved && !v.alreadyKnown).length;

  return (
    <div>
      <Link to="/songs" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-soft transition hover:text-ink">
        <ArrowLeft size={15} /> All songs
      </Link>

      <header className="mb-5">
        <h1 className="flex items-center gap-3 text-2xl font-bold tracking-tight md:text-3xl">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Music size={19} />
          </span>
          <span className="font-cn min-w-0 truncate">{song.title}</span>
        </h1>
        {song.artist && <p className="mt-1 text-sm text-soft">{song.artist}</p>}
      </header>

      <section className="anim-rise mb-5 rounded-3xl bg-paper p-5 md:p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full bg-jade-soft px-2.5 py-1 text-jade">{song.studied} lines studied</span>
            <span className="rounded-full bg-surface px-2.5 py-1 text-soft">{song.lineCount - song.studied} to go</span>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 text-accent">{song.vocabCount} words saved</span>
          </div>
        </div>
        <div className="mb-3 h-3 overflow-hidden rounded-full bg-surface">
          <div className="h-full rounded-full bg-gradient-to-r from-accent via-accent-strong to-amber transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>

        {bulkDone ? (
          <div className="anim-pop rounded-2xl bg-jade-soft p-3 text-sm text-jade">
            <span className="font-bold">Whole song studied.</span> The words are in your memory queue — keep meeting them in Review until the song is yours.
          </div>
        ) : (
          <button
            onClick={() => bulkStudy.mutate()}
            disabled={bulkStudy.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-accent-strong px-5 py-3 text-[15px] font-bold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
          >
            {bulkStudy.isPending ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
            {bulkStudy.isPending ? "Teaching every line…" : "Study whole song · one lesson"}
          </button>
        )}

        {bulkStudy.data && bulkStudy.isPending === false && (
          <div className="anim-pop mt-3 rounded-2xl bg-jade-soft p-3 text-sm text-jade">
            <span className="font-bold">Song studied.</span>{" "}
            {bulkNewWords > 0
              ? `${bulkNewWords} new words are in your memory queue now — meet them in Review.`
              : "No new words this time — everything was already in your memory."}
          </div>
        )}

        {song.notes.length > 0 && (
          <div className="mt-4 rounded-2xl bg-surface p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-soft">About this song · 歌曲简介</div>
            <ul className="space-y-1.5">
              {song.notes.map((n, i) => (
                <li key={i} className="text-sm leading-relaxed text-soft">{n}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {song.breakdown.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-soft">Key characters · 关键字</h2>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {song.breakdown.map((b, i) => (
              <div key={i} className="relative rounded-2xl bg-paper p-3.5 transition hover:bg-surface">
                <SpeakButton text={b.char} title={`Listen to ${b.char}`} className="absolute right-2 top-2 h-7 w-7" size={13} />
                <div className="font-cn text-3xl font-bold leading-none">{b.char}</div>
                <div className="mt-2 text-xs font-semibold text-accent">{b.pinyin}</div>
                <div className="mt-1 text-[13px] leading-snug">{b.meaning}</div>
                {b.note && <div className="mt-2 text-xs leading-relaxed text-soft">{b.note}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-soft">
          Lyrics · 歌词 <span className="font-normal normal-case tracking-normal">— tap a line to expand its lesson</span>
        </h2>
        <div className="space-y-2">
          {song.lines.map((line, i) => {
            const open = expanded === i;
            const hasDetail = line.grammar.length > 0 || line.notes.length > 0;
            return (
              <div key={i} className={`rounded-2xl bg-paper p-3.5 transition ${hasDetail ? "hover:bg-surface" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-cn text-[17px] font-semibold leading-snug">{line.text}</p>
                      <SpeakButton text={line.text} title={`Listen to line ${i + 1}`} className="mt-0.5 h-7 w-7" size={13} />
                    </div>
                    {line.pinyin && <p className="mt-0.5 break-words text-xs font-medium leading-relaxed text-accent">{line.pinyin}</p>}
                    {line.translation && <p className="mt-0.5 text-[13px] leading-relaxed text-soft">{line.translation}</p>}
                    {hasDetail && (
                      <button
                        onClick={() => setExpanded(open ? null : i)}
                        className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold text-accent transition hover:underline"
                      >
                        {line.grammar.length} grammar point{line.grammar.length === 1 ? "" : "s"} · {line.notes.length} note{line.notes.length === 1 ? "" : "s"}
                        <ChevronDown size={13} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                    )}
                  </div>
                </div>

                {open && hasDetail && (
                  <div className="anim-rise mt-3 space-y-2.5 rounded-xl bg-surface p-3.5">
                    {line.grammar.map((g, gi) => (
                      <div key={gi} className="flex gap-2.5 text-sm">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                        <div className="min-w-0">
                          <div className="text-[13px] font-bold">{g.point}</div>
                          <div className="mt-0.5 text-[13px] leading-relaxed text-soft">{g.explanation}</div>
                        </div>
                      </div>
                    ))}
                    {line.notes.map((n, ni) => (
                      <div key={ni} className="text-[13px] leading-relaxed text-soft">· {n}</div>
                    ))}
                    {line.sessionId && (
                      <Link to={`/history/${line.sessionId}`} className="inline-block text-[11px] font-medium text-soft transition hover:text-accent">
                        full lesson in history →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {song.vocab.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-soft">
            Words from this song · 生词 ({song.vocab.length})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {song.vocab.map((w) => (
              <div key={w.id} className="anim-pop flex items-center gap-2.5 rounded-2xl bg-paper p-3">
                <SpeakButton text={w.hanzi} title={`Listen to ${w.hanzi}`} className="h-7 w-7" size={13} />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-cn text-[15px] font-bold leading-none">{w.hanzi}</span>
                    <span className="truncate text-[11px] font-medium text-accent">{w.pinyin}</span>
                  </div>
                  <div className="truncate text-xs text-soft">{w.meaning}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-soft">
            These are in your regular review queue —{" "}
            <Link to="/review" className="font-semibold text-accent hover:underline">
              review now →
            </Link>
          </p>
        </section>
      )}
    </div>
  );
}
