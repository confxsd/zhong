import { Hono } from "hono";
import { z } from "zod";
import { rateLimited } from "../services/rate-limit.js";
import type { Env } from "../types.js";

const GOOGLE_TTS = "https://translate.google.com/translate_tts";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MAX_CHUNK = 180; // Google returns no audio for longer texts
const SYNTH_TIMEOUT_MS = 15_000;

const ttsSchema = z.object({
  text: z.string().min(1).max(500),
  rate: z.number().min(0.5).max(2).default(1),
});

async function sha1(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function chunkText(text: string, max: number): string[] {
  const chars = Array.from(text);
  const chunks: string[] = [];
  for (let i = 0; i < chars.length; i += max) {
    chunks.push(chars.slice(i, i + max).join(""));
  }
  return chunks;
}

/** One Google Translate TTS request. Returns MP3 bytes. */
async function synthChunk(text: string, speed: number): Promise<ArrayBuffer> {
  const url = new URL(GOOGLE_TTS);
  url.searchParams.set("ie", "UTF-8");
  url.searchParams.set("client", "tw-ob");
  url.searchParams.set("tl", "zh-CN");
  url.searchParams.set("q", text);
  url.searchParams.set("ttsspeed", String(speed));
  url.searchParams.set("total", "1");
  url.searchParams.set("idx", "0");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SYNTH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": UA, Referer: "https://translate.google.com/" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Google TTS replied ${res.status}`);
    return await res.arrayBuffer();
  } finally {
    clearTimeout(timeout);
  }
}

/** Synthesize text (chunked if needed) and concatenate the MP3 segments. */
async function synth(text: string, rate: number): Promise<ArrayBuffer> {
  const speed = Math.min(1, Math.max(0.24, rate));
  const chunks = chunkText(text, MAX_CHUNK);
  const parts = await Promise.all(chunks.map((chunk) => synthChunk(chunk, speed)));
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(new Uint8Array(part), offset);
    offset += part.byteLength;
  }
  return merged.buffer;
}

const ttsRouter = new Hono<{ Bindings: Env }>();

ttsRouter.post("/", async (c) => {
  const parsed = ttsSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid TTS request" }, 400);

  const ip = c.req.header("cf-connecting-ip") ?? "unknown";
  if (await rateLimited(c.env.DB, ip, 120)) {
    return c.json({ error: "Too many audio requests, slow down" }, 429);
  }

  const { text, rate } = parsed.data;
  const key = await sha1(`${rate}:${text}`);
  const cacheKey = new Request(`https://tts.zhong.local/audio/${key}`);
  const cache = caches.default;

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const audio = await synth(text, rate);
  const response = new Response(audio, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
  await cache.put(cacheKey, response.clone());
  return response;
});

export default ttsRouter;
