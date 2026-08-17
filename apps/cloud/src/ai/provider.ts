import type { Env } from "../types.js";
import type { AIProvider, ChatJsonOptions, ChatMessage } from "./types.js";

type AIProviderName = "deepseek" | "openai" | "openai-compatible";

export interface AIProviderSettings {
  name: AIProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const providerSettings = (env: Env): AIProviderSettings => {
  const name = (env.AI_PROVIDER ?? "deepseek") as AIProviderName;
  switch (name) {
    case "openai":
      return {
        name,
        apiKey: env.OPENAI_API_KEY ?? "",
        baseUrl: env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
        model: env.OPENAI_MODEL ?? "gpt-4o-mini",
      };
    case "openai-compatible":
      return {
        name,
        apiKey: env.AI_API_KEY ?? "",
        baseUrl: env.AI_BASE_URL ?? "http://localhost:11434/v1",
        model: env.AI_MODEL ?? "llama3",
      };
    case "deepseek":
    default:
      return {
        name: "deepseek",
        apiKey: env.DEEPSEEK_API_KEY ?? "",
        baseUrl: env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
        model: env.DEEPSEEK_MODEL ?? "deepseek-chat",
      };
  }
};

/**
 * Generic adapter for any OpenAI-compatible chat-completions API:
 * DeepSeek, OpenAI, Groq, Together, Moonshot, Ollama (/v1), LM Studio, ...
 * Configured entirely via worker vars and secrets — see wrangler.toml.
 */
class OpenAICompatibleProvider implements AIProvider {
  readonly name: string;
  readonly model: string;
  readonly configured: boolean;

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(settings: AIProviderSettings) {
    this.name = settings.name;
    this.model = settings.model;
    this.apiKey = settings.apiKey;
    this.baseUrl = settings.baseUrl.replace(/\/+$/, "");
    this.configured = settings.apiKey.length > 0;
  }

  async chatJson<T = unknown>(messages: ChatMessage[], opts: ChatJsonOptions = {}): Promise<T> {
    const { temperature = 0.4, maxTokens = 4096, signal } = opts;
    if (!this.configured) throw new Error(`${this.name} API key is not configured`);

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
      }),
      signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      let detail = body.slice(0, 400);
      if (res.status === 401) detail = "Invalid API key";
      else if (res.status === 402) detail = "API quota exhausted — check your billing";
      else if (res.status === 429) detail = "Rate limited — wait a moment and retry";
      throw new Error(`${this.name} API error ${res.status}: ${detail}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error(`${this.name} returned an empty response`);

    let parsed: T;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new Error(`${this.name} did not return valid JSON`);
    }
    return parsed;
  }
}

export function getProvider(env: Env): AIProvider {
  return new OpenAICompatibleProvider(providerSettings(env));
}
