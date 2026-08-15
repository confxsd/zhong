import { useQuery } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { api } from "../api/client";

export default function ProviderBanner() {
  const { data } = useQuery({ queryKey: ["health"], queryFn: api.health, retry: false });

  if (!data || data.provider.configured) return null;

  const varName = data.provider.name === "openai" ? "OPENAI_API_KEY" : data.provider.name === "openai-compatible" ? "AI_API_KEY" : "DEEPSEEK_API_KEY";

  return (
    <div className="anim-rise mb-5 rounded-2xl bg-amber-soft p-4">
      <div className="flex items-start gap-3">
        <KeyRound size={18} className="mt-0.5 shrink-0 text-amber" />
        <div className="text-sm leading-relaxed">
          <div className="font-bold">No AI provider key found.</div>
          <p className="mt-1 text-soft">
            Zhong only works after you connect a model. The server is currently configured for{" "}
            <span className="font-semibold text-ink">{data.provider.name}</span> (<span className="font-semibold text-ink">{data.provider.model}</span>).
            Add <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[12px]">{varName}=...</code> to{" "}
            <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[12px]">apps/server/.env</code> and restart the server. See{" "}
            <code className="rounded bg-paper px-1.5 py-0.5 font-mono text-[12px]">.env.example</code> for switching providers.
          </p>
        </div>
      </div>
    </div>
  );
}