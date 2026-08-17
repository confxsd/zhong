import { stats } from "./srs.js";
import { listTracks, nextWords, seedTracksIfEmpty } from "./tracks.js";

/** Daily new-word quota: adaptive — shrinks when backlog or retention suffers. */
export async function newWordsQuota(db: D1Database): Promise<number> {
  const s = await stats(db);
  let quota = 8;
  if (s.due > 30) quota = 5;
  if (s.due > 60) quota = 3;
  if (s.retention < 0.8) quota = Math.min(quota, 5);
  if (s.retention < 0.7) quota = Math.min(quota, 3);
  return quota;
}

export interface Plan {
  due: number;
  reviewsToday: number;
  streak: number;
  retention: number;
  newQuota: number;
  wordsToday: number;
  track: {
    slug: string;
    title: string;
    total: number;
    started: number;
    mastered: number;
    nextCount: number;
    nextPreview: string[];
  } | null;
}

export async function dailyPlan(db: D1Database): Promise<Plan> {
  await seedTracksIfEmpty(db);
  const s = await stats(db);
  const tracks = await listTracks(db);
  const track = tracks[0] ?? null;

  let trackPlan: Plan["track"] = null;
  if (track) {
    const next = await nextWords(db, track.slug, 5);
    trackPlan = {
      slug: track.slug,
      title: track.title,
      total: track.total,
      started: track.started,
      mastered: track.mastered,
      nextCount: Math.min(await newWordsQuota(db), Math.max(0, track.total - track.mastered)),
      nextPreview: next.map((w) => w.word.hanzi),
    };
  }

  return {
    due: s.due,
    reviewsToday: s.reviewsToday,
    streak: s.streak,
    retention: s.retention,
    newQuota: await newWordsQuota(db),
    wordsToday: s.wordsToday,
    track: trackPlan,
  };
}
