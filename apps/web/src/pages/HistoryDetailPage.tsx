import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import ResultView from "../components/ResultView";
import { formatDate } from "../lib/format";

export default function HistoryDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["session", id],
    queryFn: () => api.session(Number(id)),
    enabled: !!id && !Number.isNaN(Number(id)),
  });

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="mb-4 flex items-center gap-1.5 text-sm font-medium text-soft transition hover:text-ink"
      >
        <ArrowLeft size={16} /> Back
      </button>

      {isLoading && <div className="py-16 text-center text-sm text-soft">Loading session…</div>}

      {isError && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-6 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300">
          Couldn't load this session. It may have been deleted.
        </div>
      )}

      {data && (
        <>
          <header className="mb-5 flex items-baseline gap-3">
            <h1 className="font-cn text-xl font-semibold md:text-2xl">{data.input_text}</h1>
            <span className="text-xs text-soft">studied {formatDate(data.created_at)}</span>
          </header>
          <ResultView result={data} />
        </>
      )}
    </div>
  );
}