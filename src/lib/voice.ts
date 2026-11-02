"use client";

import { useSyncExternalStore } from "react";

// Voice for the agent and the manager.
// - The agent speaks its lines through /api/tts (ElevenLabs) when the server has a key.
// - "Live" mic: the browser's speech recognition (Chrome) turns Sam's words into text.
//   "Scripted" (default) plays the night's story, so a demo never depends on a room's acoustics.

export type MicMode = "scripted" | "live";
type Settings = { sound: boolean; mic: MicMode };

const KEY = "bt-voice";
const read = (): Settings => {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    // The prototype only offers the scripted night (live mic stays in the code for later).
    return { sound: v.sound !== false, mic: "scripted" };
  } catch {
    return { sound: true, mic: "scripted" };
  }
};
let current: Settings | null = null;
const get = () => (current ??= read());
const SERVER: Settings = { sound: true, mic: "scripted" };

export function setVoice(next: Partial<Settings>) {
  current = { ...get(), ...next };
  try { localStorage.setItem(KEY, JSON.stringify(current)); } catch {}
  window.dispatchEvent(new Event("bt-voice"));
  if (!current.sound) stopSpeaking();
}

export function useVoice(): Settings {
  return useSyncExternalStore(
    (cb) => { window.addEventListener("bt-voice", cb); return () => window.removeEventListener("bt-voice", cb); },
    get,
    () => SERVER,
  );
}

// ---- The agent's voice

let enabled: Promise<boolean> | null = null;
// The agent's scripted lines, pre-recorded with neural voices (public/voice, see manifest.json).
let recorded: Promise<Record<string, string>> | null = null;
const recordings = () => (recorded ??= fetch("/voice/manifest.json").then((r) => r.json()).catch(() => ({})));
let audio: HTMLAudioElement | null = null;
let seq = 0;

export function ttsEnabled() {
  enabled ??= fetch("/api/tts").then((r) => r.json()).then((d: { enabled: boolean }) => d.enabled).catch(() => false);
  return enabled;
}

// Whoever is waiting for the current line to finish (a screen that moves on after the agent speaks).
let finish: (() => void) | null = null;
const settle = () => { const f = finish; finish = null; f?.(); };

export function stopSpeaking() {
  seq += 1;
  audio?.pause();
  audio = null;
  if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  settle();
}

/** Play a file; resolves when it ends, fails, or a newer line cuts it off. */
function play(src: string) {
  return new Promise<void>((resolve) => {
    audio?.pause();
    settle();
    finish = resolve;
    const a = new Audio(src);
    audio = a;
    a.onended = settle;
    a.onerror = settle;
    a.play().catch(settle);
  });
}

// Without an ElevenLabs key the browser's own voice reads the line (macOS has Polish "Zosia").
function speakBrowser(text: string, lang: "pl" | "en") {
  return new Promise<void>((resolve) => {
    const synth = window.speechSynthesis;
    if (!synth) return resolve();
    synth.cancel();
    settle();
    finish = resolve;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "pl" ? "pl-PL" : "en-GB";
    const voices = synth.getVoices().filter((v) => v.lang.toLowerCase().startsWith(lang));
    u.voice = voices.find((v) => /Zosia|Daniel|Serena|Google|Premium|Enhanced/.test(v.name)) ?? voices[0] ?? null;
    u.rate = 1.02;
    u.onend = settle;
    u.onerror = settle;
    synth.speak(u);
  });
}

/**
 * Speak one agent line; newer lines cut older ones off. Order: the pre-recorded line (neural voice, free,
 * works offline and when deployed), then ElevenLabs with a key, then the browser's own voice. Silent with sound off.
 * Resolves when the line has been said (or immediately when there is nothing to play).
 */
export async function speak(text: string): Promise<void> {
  if (typeof window === "undefined" || !get().sound || !text.trim()) return;
  const mine = ++seq;
  const lang = document.documentElement.lang === "pl" ? "pl" : "en";
  const file = (await recordings())[`${lang}:${text}`];
  if (mine !== seq) return;
  if (file) {
    window.speechSynthesis?.cancel();
    return play(`/voice/${file}.mp3`);
  }
  if (!(await ttsEnabled())) {
    if (mine === seq) return speakBrowser(text, lang);
    return;
  }
  try {
    const res = await fetch("/api/tts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text, lang }) });
    if (res.status !== 200 || mine !== seq) return;
    const url = URL.createObjectURL(await res.blob());
    await play(url);
    URL.revokeObjectURL(url);
  } catch {}
}

// ---- Sam's voice (live mode)

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null; onerror: (() => void) | null;
  start: () => void; stop: () => void;
};

export function canListen() {
  return typeof window !== "undefined" && Boolean((window as unknown as { webkitSpeechRecognition?: unknown; SpeechRecognition?: unknown }).SpeechRecognition ?? (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);
}

/** Listen to the mic; onText gets everything heard so far. Returns stop(), or null if unsupported. */
export function listen({ continuous, onText, onEnd }: { continuous: boolean; onText: (text: string, final: boolean) => void; onEnd?: () => void }) {
  const W = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
  if (!Ctor) return null;
  stopSpeaking();
  const r = new Ctor();
  r.lang = document.documentElement.lang === "pl" ? "pl-PL" : "en-GB";
  r.continuous = continuous;
  r.interimResults = true;
  let done = "";
  r.onresult = (e) => {
    let interim = "";
    let final = false;
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const res = e.results[i];
      if (res.isFinal) { done += res[0].transcript + " "; final = true; } else interim += res[0].transcript;
    }
    onText((done + interim).trim(), final && !interim);
  };
  r.onend = () => onEnd?.();
  r.onerror = () => onEnd?.();
  try { r.start(); } catch { return null; }
  return () => { try { r.stop(); } catch {} };
}
