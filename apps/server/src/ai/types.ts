export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatJsonOptions = {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

/**
 * A language-model provider capable of structured (JSON) completions.
 * Implementations should be thin adapters; prompt/validation logic lives
 * outside so providers never influence teaching quality.
 */
export interface AIProvider {
  readonly name: string;
  readonly model: string;
  readonly configured: boolean;
  chatJson<T = unknown>(messages: ChatMessage[], opts?: ChatJsonOptions): Promise<T>;
}