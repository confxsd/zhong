import { config } from "../config.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";
import { AIProvider } from "./types.js";

let instance: AIProvider | null = null;

/**
 * Returns the singleton provider selected by AI_PROVIDER (default "deepseek").
 * All built-in providers speak the OpenAI-compatible protocol, so switching
 * is a config change. For a truly custom protocol, implement AIProvider and
 * register it here.
 */
export function getProvider(): AIProvider {
  if (!instance) {
    instance = new OpenAICompatibleProvider(config.ai);
  }
  return instance;
}

export function resetProvider(): void {
  instance = null;
}