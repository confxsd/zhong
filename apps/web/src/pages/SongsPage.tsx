import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, Loader2, Music, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../api/client";
import { useToast } from "../components/Toast";
import { timeAgo } from "../lib/format";
import type { SongSummary } from "../types";

export default function SongsPage() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [lyrics, setLyrics] = useState("");
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data: songs, isLoading } = useQuery({
    queryKey: ["songs"],
    queryFn: () => api.songs(),
    staleTime: 30_000,
  });

  const addSong = useMutation({
    mutationFn: async () => {
      const song = await api.addSong({ title, artist, lyrics });
      try {
        const studied = await api.studySong(song.id);
        return studied.song;
      } catch {
        return song;
      }
    },
    onSuccess: (song) => {
      queryClient.setQueryData(["song", song.id], song);
      void queryClient.invalidateQueries({ queryKey: ["songs"] });
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      navigate(`/songs/${song.id}`);
    },
    onError: (err) => {
      if (err instanceof ApiError) toast(err.message, "error");
      else toast("Something went wrong — try again.", "error");
    },
  });

  const deleteSong = useMutation({
    mutationFn: (id: number) => api.deleteSong(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["songs"] });
      toast("Song removed");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const submit = () => {
    if (!lyrics.trim()) {
      toast("Paste the lyrics first — title and artist are optional.", "error");
      return;
    }
    addSong.mutate();
  };

  return (
    <div>
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          Songs <span className="font-cn text-accent">歌曲</span>
        </h1>
        <p className="mt-1 text-sm text-soft">Learn Chinese through the songs you love. Paste full lyrics — Zhong glosses and teaches every line automatically, and the words enter your review queue like everything else.</p>
      </header>

      <div className="anim-rise rounded-3xl bg-paper p-4 md:p-6">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-5 py-3 text-[15px] font-semibold text-white transition hover:bg-accent-strong"
        >
          <Plus size={17} />
          {open ? "Close" : "Add a song"}
        </button>

        {open && (
          <div className="anim-rise mt-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Song title (optional — Zhong can guess)"
                className="w-full rounded-2xl bg-surface px-4 py-3 text-[16px] outline-none transition placeholder:text-soft/70 focus:bg-surface-strong"
              />
              <input
                value={artist}
                onChange={(e) => setArtist(e.target.value)}
                placeholder="Artist (optional)"
                className="w-full rounded-2xl bg-surface px-4 py-3 text-[16px] outline-none transition placeholder:text-soft/70 focus:bg-surface-strong"
              />
            </div>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder={"Paste the full Chinese lyrics here…\n\n例如：\n月亮代表我的心\n你问我爱你有多深\n我爱你有几分"}
              rows={10}
              className="w-full resize-y rounded-2xl bg-surface p-4 text-[16px] leading-relaxed outline-none transition placeholder:text-soft/70 focus:bg-surface-strong"
            />
            <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-3">
              <button
                onClick={submit}
                disabled={addSong.isPending}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-accent-strong px-5 py-3 text-[15px] font-bold text-white shadow-md transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {addSong.isPending ? <Loader2 size={17} className="animate-spin" /> : <Music size={17} />}
                {addSong.isPending ? "Teaching every line…" : "Add & study song"}
              </button>
              <span className="text-xs text-soft">Glossed and fully studied automatically — every line, no extra taps.</span>
            </div>
          </div>
        )}
      </div>

      {isLoading && <div className="py-16 text-center text-sm text-soft">Loading…</div>}

      {!isLoading && (songs ?? []).length === 0 && !open && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Music size={32} className="text-soft/50" />
          <div className="text-sm text-soft">No songs yet. Paste your favorite lyrics above and start singing your way to fluency.</div>
        </div>
      )}

      <section className="mt-6 space-y-2">
        {(songs ?? []).map((s: SongSummary) => {
          const pct = s.lineCount > 0 ? Math.round((s.studied / s.lineCount) * 100) : 0;
          return (
            <Link
              key={s.id}
              to={`/songs/${s.id}`}
              className="group flex items-center gap-4 rounded-2xl bg-paper px-4 py-3.5 transition hover:bg-surface"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Music size={17} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[15px] font-semibold">{s.title}</span>
                <span className="block truncate text-xs text-soft">{s.artist || "unknown artist"}</span>
              </span>
              <span className="hidden flex-col items-end gap-1 sm:flex">
                <span className="text-xs text-soft">
                  {s.studied}/{s.lineCount} lines · {s.vocabCount} words
                </span>
                <span className="h-1.5 w-28 overflow-hidden rounded-full bg-surface">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-2 py-0.5 text-[11px] text-soft">
                <BookOpen size={11} className="text-accent" /> {s.vocabCount}
              </span>
              <span className="hidden w-14 shrink-0 text-right text-xs text-soft md:block">{timeAgo(s.created_at)}</span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  deleteSong.mutate(s.id);
                }}
                title="Delete song"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-soft transition hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
              >
                <Trash2 size={15} />
              </button>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
