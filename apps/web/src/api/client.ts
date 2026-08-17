import type {
  Grade,
  Health,
  Plan,
  ReviewCard,
  SessionDetail,
  SessionSummary,
  SongBulkStudyResult,
  SongDetail,
  SongSummary,
  TeachResult,
  Track,
  TrackLessonResult,
  VocabStatus,
  VocabWord,
} from "../types";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError("Cannot reach the Zhong server. Start it with `npm run dev` from the repo root.", 0);
  }
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* keep default */
    }
    throw new ApiError(message, res.status);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => request<Health>("/api/health"),
  stats: () => request<Health>("/api/health").then((h) => h.stats),

  translate: (text: string, signal?: AbortSignal) =>
    request<TeachResult>("/api/translate", { method: "POST", body: JSON.stringify({ text }), signal }),

  sessions: (limit = 30) => request<SessionSummary[]>(`/api/sessions?limit=${limit}`),
  session: (id: number) => request<SessionDetail>(`/api/sessions/${id}`),
  deleteSession: (id: number) => request<{ ok: boolean }>(`/api/sessions/${id}`, { method: "DELETE" }),

  vocab: (status: VocabStatus | "all" = "all", search = "") =>
    request<VocabWord[]>(`/api/vocab?status=${status}&search=${encodeURIComponent(search)}`),
  deleteVocab: (id: number) => request<{ ok: boolean }>(`/api/vocab/${id}`, { method: "DELETE" }),

  reviewDue: (limit = 20) => request<{ cards: ReviewCard[]; remaining: number }>(`/api/review/due?limit=${limit}`),
  reviewGrade: (id: number, grade: Grade) =>
    request<{ card: ReviewCard; remaining: number }>(`/api/review/${id}`, {
      method: "POST",
      body: JSON.stringify({ grade }),
    }),

  plan: () => request<Plan>("/api/plan"),
  tracks: () => request<Track[]>("/api/tracks"),
  track: (slug: string) => request<Track>(`/api/tracks/${slug}`),
  trackLesson: (slug: string) => request<TrackLessonResult>(`/api/tracks/${slug}/lesson`, { method: "POST" }),

  songs: () => request<SongSummary[]>("/api/songs"),
  song: (id: number) => request<SongDetail>(`/api/songs/${id}`),
  addSong: (body: { title: string; artist: string; lyrics: string }) =>
    request<SongDetail>("/api/songs", { method: "POST", body: JSON.stringify(body) }),
  studySong: (id: number) => request<SongBulkStudyResult>(`/api/songs/${id}/study`, { method: "POST" }),
  deleteSong: (id: number) => request<{ ok: boolean }>(`/api/songs/${id}`, { method: "DELETE" }),
};