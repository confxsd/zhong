export function timeAgo(iso: string | null): string {
  if (!iso) return "never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Next interval label given the current SRS box and a grade (box -> days). */
export const SRS_DAYS = [1, 1, 2, 4, 7, 14, 30, 60];

export function nextIntervalLabel(box: number, grade: string): string {
  let next = box;
  if (grade === "again") next = 1;
  else if (grade === "hard") next = Math.max(1, box);
  else if (grade === "good") next = box === 0 ? 2 : Math.min(7, box + 1);
  else next = Math.min(7, box + 2);
  return daysLabel(SRS_DAYS[next]);
}

export function daysLabel(days: number): string {
  if (days <= 1) return "1 day";
  if (days < 30 && days % 7 !== 0) return `${days} days`;
  const weeks = Math.round(days / 7);
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

export const GRADES: { key: "again" | "hard" | "good" | "easy"; label: string; hint: string; tone: "hard" | "neutral" | "good" | "great" }[] = [
  { key: "again", label: "Again", hint: "forgot it", tone: "hard" },
  { key: "hard", label: "Hard", hint: "barely", tone: "neutral" },
  { key: "good", label: "Good", hint: "remembered", tone: "good" },
  { key: "easy", label: "Easy", hint: "too easy", tone: "great" },
];