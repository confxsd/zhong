import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useToast } from "../components/Toast";
import { formatDate } from "../lib/format";

export default function HistoryPage() {
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const toast = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ["sessions"], queryFn: () => api.sessions(50) });

  const remove = useMutation({
    mutationFn: (id: number) => api.deleteSession(id),
    onSuccess: (_, id) => {
      setHidden((s) => new Set(s).add(id));
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast("Session deleted");
    },
    onError: (err: Error) => toast(err.message, "error"),
  });

  const rows = (data ?? []).filter((s) => !hidden.has(s.id));

  return (
    <div>
      <header className="mb-5">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight md:text-3xl">
          History <span className="font-cn text-accent">记录</span>
          <span className="mt-1 rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-soft">{rows.length}</span>
        </h1>
        <p className="mt-1 text-sm text-soft">Every text you've studied, with the words it added to your library.</p>
      </header>

      {isLoading && <div className="py-16 text-center text-sm text-soft">Loading…</div>}

      {!isLoading && rows.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <Clock size={32} className="text-soft/50" />
          <div className="text-sm text-soft">Nothing here yet — your study sessions will show up automatically.</div>
          <Link to="/" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong">
            Study your first text →
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {rows.map((s) => (
          <div key={s.id} className="group flex items-center gap-4 rounded-2xl bg-paper px-4 py-3.5 transition hover:bg-surface">
            <Link to={`/history/${s.id}`} className="flex min-w-0 flex-1 items-center gap-4">
              <span className="font-cn flex-1 truncate text-[15px] font-medium">{s.input_text}</span>
              <span className="hidden max-w-60 truncate text-sm text-soft md:block">{s.translation}</span>
            </Link>
            <span className="shrink-0 rounded-full bg-surface px-2 py-0.5 text-[11px] text-soft">{s.vocab_count} words</span>
            <span className="w-28 shrink-0 text-right text-xs text-soft">{formatDate(s.created_at)}</span>
            <button
              onClick={() => remove.mutate(s.id)}
              title="Delete session"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-soft opacity-0 transition group-hover:opacity-100 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}