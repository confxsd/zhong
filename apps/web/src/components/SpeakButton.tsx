import { Volume2 } from "lucide-react";
import { useSpeech } from "../lib/speech";

interface Props {
  text: string;
  size?: number;
  rate?: number;
  title?: string;
  className?: string;
}

export default function SpeakButton({ text, size = 15, rate = 1, title = "Listen", className = "" }: Props) {
  const { toggle, isActive } = useSpeech();
  const active = isActive(text, rate);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle(text, { rate });
      }}
      title={title}
      aria-label={title}
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
        active ? "bg-accent text-white" : "text-soft hover:bg-surface hover:text-ink"
      } ${className}`}
    >
      <Volume2 size={size} />
    </button>
  );
}
