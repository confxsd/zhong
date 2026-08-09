import "dotenv/config";
import path from "node:path";

export type AIProviderName = "deepseek" | "openai" | "openai-compatible";

export interface AIProviderSettings {
  name: AIProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const providerSettings = (): AIProviderSettings => {
  const name = (process.env.AI_PROVIDER ?? "deepseek") as AIProviderName;
  switch (name) {
    case "openai":
      return {
        name,
        apiKey: process.env.OPENAI_API_KEY ?? "",
        baseUrl: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      };
    case "openai-compatible":
      return {
        name,
        apiKey: process.env.AI_API_KEY ?? "",
        baseUrl: process.env.AI_BASE_URL ?? "http://localhost:11434/v1",
        model: process.env.AI_MODEL ?? "llama3",
      };
    case "deepseek":
    default:
      return {
        name: "deepseek",
        apiKey: process.env.DEEPSEEK_API_KEY ?? "",
        baseUrl: process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
        model: process.env.DEEPSEEK_MODEL ?? "deepseek-chat",
      };
  }
};

export const config = {
  port: Number(process.env.PORT ?? 4450),
  dbPath: path.resolve(process.cwd(), process.env.DB_PATH ?? "apps/server/data/zhong.db"),
  webDist: path.resolve(process.cwd(), "apps/web/dist"),
  ai: providerSettings(),
};

export const aiConfigured = () => config.ai.apiKey.length > 0;