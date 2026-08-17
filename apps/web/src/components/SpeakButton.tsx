import { Turtle, Volume2 } from "lucide-react";
import { useSpeech } from "../lib/speech";

interface Props {
  text: string;
  size?: number;
  rate?: number;
  title?: string;
  label?: string;
  className?: string;
}

export default function SpeakButton({ text, size = 15, rate = 1, title = "Listen", label, className = "" }: Props) {
  const { toggle, isActive } = useSpeech();
  const active = isActive(text, rate);
  const Icon = rate !== 1 ? Turtle : Volume2;

  if (label) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggle(text, { rate });
        }}
        title={title}
        aria-label={title}
        className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition ${
          active ? "bg-accent text-white" : "text-soft hover:bg-surface hover:text-ink"
        } ${className}`}
      >
        <Icon size={14} />
        {label}
      </button>
    );
  }

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
      <Icon size={size} />
    </button>
  );
}
