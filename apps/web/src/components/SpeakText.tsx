import { useSpeech } from "../lib/speech";

interface Props {
  text: string;
  rate?: number;
  title?: string;
  className?: string;
}

export default function SpeakText({ text, rate = 1, title, className = "" }: Props) {
  const { toggle, isActive } = useSpeech();
  const active = isActive(text, rate);

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        toggle(text, { rate });
      }}
      title={title ?? `Listen to ${text}`}
      aria-label={title ?? `Listen to ${text}`}
      className={`rounded-md transition ${
        active ? "bg-accent-soft text-accent" : "hover:bg-accent-soft hover:text-accent"
      } ${className}`}
    >
      {text}
    </button>
  );
}
