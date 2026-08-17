import { useSyncExternalStore } from "react";

export interface SpeakOptions {
  rate?: number;
}

interface ActiveSpeech {
  id: number;
  text: string;
  rate: number;
}

let active: ActiveSpeech | null = null;
let nextId = 0;
let cachedVoice: SpeechSynthesisVoice | null = null;
const listeners = new Set<() => void>();

function getSynth(): SpeechSynthesis | null {
  return "speechSynthesis" in window ? window.speechSynthesis : null;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function getActive(): ActiveSpeech | null {
  return active;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice;
  const synth = getSynth();
  if (!synth) return null;
  const voices = synth.getVoices();
  cachedVoice =
    voices.find((v) => v.lang.toLowerCase() === "zh-cn" && v.localService) ??
    voices.find((v) => v.lang.toLowerCase() === "zh-cn") ??
    voices.find((v) => v.lang.toLowerCase().startsWith("zh")) ??
    null;
  return cachedVoice;
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.addEventListener("voiceschanged", () => {
    cachedVoice = null;
  });
}

function finish(id: number): void {
  if (active?.id === id) {
    active = null;
    emit();
  }
}

export function speak(text: string, options: SpeakOptions = {}): void {
  const synth = getSynth();
  if (!synth || !text.trim()) return;
  synth.cancel();
  synth.resume();

  const rate = options.rate ?? 1;
  const id = ++nextId;
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = pickVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  } else {
    utterance.lang = "zh-CN";
  }
  utterance.rate = rate;
  utterance.onend = () => finish(id);
  utterance.onerror = () => finish(id);

  active = { id, text, rate };
  emit();
  synth.speak(utterance);
}

export function stopSpeaking(): void {
  getSynth()?.cancel();
  if (active) {
    active = null;
    emit();
  }
}

export interface SpeechController {
  isSpeaking: boolean;
  isActive: (text: string, rate?: number) => boolean;
  toggle: (text: string, options?: SpeakOptions) => void;
  stop: () => void;
}

export function useSpeech(): SpeechController {
  const current = useSyncExternalStore(subscribe, getActive, getActive);
  return {
    isSpeaking: current !== null,
    isActive: (text, rate = 1) => current !== null && current.text === text && current.rate === rate,
    toggle: (text, options = {}) => {
      const rate = options.rate ?? 1;
      if (current && current.text === text && current.rate === rate) {
        stopSpeaking();
      } else {
        speak(text, options);
      }
    },
    stop: stopSpeaking,
  };
}
