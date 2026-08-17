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

export function daysLabel(days: number): string {
  if (days <= 1) return "1 day";
  if (days < 30 && days % 7 !== 0) return `${days} days`;
  const weeks = Math.round(days / 7);
  return `${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}

/** Compact FSRS interval label from milliseconds ("10m", "3h", "7d", "3w", "2mo"). */
export function intervalLabel(ms: number): string {
  if (ms <= 0) return "now";
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 14) return `${days}d`;
  const weeks = Math.round(days / 7);
  if (days < 60) return `${weeks}w`;
  return `${Math.round(days / 30)}mo`;
}

/** Today's date in Chinese: 2026年8月17日 星期一 */
export function chineseDate(now = new Date()): string {
  const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
  return `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 星期${weekdays[now.getDay()]}`;
}

export const GRADES: { key: "again" | "hard" | "good" | "easy"; label: string; hint: string; tone: "hard" | "neutral" | "good" | "great" }[] = [
  { key: "again", label: "Again", hint: "forgot it", tone: "hard" },
  { key: "hard", label: "Hard", hint: "barely", tone: "neutral" },
  { key: "good", label: "Good", hint: "remembered", tone: "good" },
  { key: "easy", label: "Easy", hint: "too easy", tone: "great" },
];