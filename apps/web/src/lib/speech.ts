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
let currentAudio: HTMLAudioElement | null = null;
let cachedVoice: SpeechSynthesisVoice | null = null;
const listeners = new Set<() => void>();

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
  if (!("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
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

function start(text: string, rate: number): number {
  const id = ++nextId;
  active = { id, text, rate };
  emit();
  return id;
}

function finish(id: number): void {
  if (active?.id === id) {
    active = null;
    emit();
  }
}

async function playRemote(text: string, rate: number): Promise<boolean> {
  const id = start(text, rate);
  let res: Response;
  try {
    res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, rate }),
    });
  } catch {
    if (active?.id === id) finish(id);
    return false;
  }
  if (!res.ok) {
    if (active?.id === id) finish(id);
    return false;
  }

  const blob = await res.blob();
  if (active?.id !== id) return false;

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  currentAudio = audio;
  const cleanup = () => {
    URL.revokeObjectURL(url);
    finish(id);
  };
  audio.onended = cleanup;
  audio.onerror = cleanup;
  try {
    await audio.play();
  } catch {
    cleanup();
    return false;
  }
  return true;
}

function playFallback(text: string, rate: number): boolean {
  if (!("speechSynthesis" in window)) return false;
  const synth = window.speechSynthesis;
  synth.cancel();
  const id = start(text, rate);
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
  synth.speak(utterance);
  return true;
}

export async function speak(text: string, options: SpeakOptions = {}): Promise<void> {
  const rate = options.rate ?? 1;
  if (!text.trim()) return;
  stopSpeaking();
  const played = await playRemote(text, rate);
  if (!played && active === null) playFallback(text, rate);
}

export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
  }
  if ("speechSynthesis" in window) window.speechSynthesis.cancel();
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
        void speak(text, options);
      }
    },
    stop: stopSpeaking,
  };
}
