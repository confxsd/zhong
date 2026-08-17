const RATE_LIMIT_PER_HOUR = 60;

/**
 * Lightweight per-IP rate limit to protect the AI budget from accidental
 * loops or casual abuse. One row per IP in D1, cleaned opportunistically.
 * Returns true when the request should be blocked.
 */
export async function rateLimited(db: D1Database, ip: string, limitPerHour = RATE_LIMIT_PER_HOUR): Promise<boolean> {
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / 3_600_000) * 3_600_000).toISOString();

  const row = await db
    .prepare("SELECT count, window_start FROM rate_limits WHERE ip = ?")
    .bind(ip)
    .first<{ count: number; window_start: string } | null>();

  if (row && row.window_start === windowStart && row.count >= limitPerHour) return true;

  await db
    .prepare(
      `INSERT INTO rate_limits (ip, window_start, count) VALUES (?1, ?2, 1)
       ON CONFLICT(ip) DO UPDATE SET
         count = CASE WHEN window_start = ?2 THEN count + 1 ELSE 1 END,
         window_start = ?2`
    )
    .bind(ip, windowStart)
    .run();

  if (Math.random() < 0.02) {
    await db
      .prepare("DELETE FROM rate_limits WHERE window_start < ?")
      .bind(new Date(now - 7_200_000).toISOString())
      .run();
  }

  return false;
}
