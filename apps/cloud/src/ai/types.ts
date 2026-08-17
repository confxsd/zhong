export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type ChatJsonOptions = {
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
};

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  readonly configured: boolean;
  chatJson<T = unknown>(messages: ChatMessage[], opts?: ChatJsonOptions): Promise<T>;
}
