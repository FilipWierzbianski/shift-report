"use client";

import Link from "next/link";
import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { useT } from "@/lib/i18n";
import { speak } from "@/lib/voice";
import { cn } from "@/lib/utils";

export function Label({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("text-[11px] font-bold uppercase tracking-[0.1em] text-text-2", className)} {...props} />;
}

type PillVariant = "primary" | "secondary" | "ghost" | "ai" | "attention";

const pill: Record<PillVariant, string> = {
  primary: "bg-text-1 text-ai-ink hover:bg-white active:bg-body",
  secondary: "bg-surface-2 text-text-1 hover:brightness-125",
  ghost: "bg-transparent text-text-2 hover:text-text-1",
  ai: "bg-ai text-ai-ink hover:bg-ai-pressed",
  attention: "bg-attention/15 text-attention hover:bg-attention/25",
};

export function Pill({
  variant = "primary",
  size = "lg",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: PillVariant; size?: "lg" | "md" | "sm" }) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-bold transition-colors disabled:pointer-events-none disabled:bg-surface-2 disabled:text-text-3",
        size === "lg" && "h-14 px-6 text-[15px]",
        size === "md" && "h-12 px-5 text-sm",
        size === "sm" && "h-11 px-4 text-[13px]",
        pill[variant],
        className,
      )}
      {...props}
    />
  );
}

export function PillLink({
  variant = "primary",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: PillVariant }) {
  return (
    <Link
      className={cn("inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold transition-colors", pill[variant], className)}
      {...props}
    />
  );
}

export function IconButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn("grid size-11 shrink-0 place-items-center rounded-[14px] bg-surface text-text-1 transition-colors hover:bg-surface-2 [&_svg]:size-[18px]", className)}
      {...props}
    />
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-[20px] bg-surface", className)} {...props} />;
}

export function SourceChip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-lg bg-ai/10 px-2 py-0.5 text-[11px] font-semibold text-ai", className)}>
      <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" /></svg>
      {children}
    </span>
  );
}

/** Agent speech: words sharpen in one by one; the newest stay soft (Superadt's blurred tail). */
export function SpeakText({
  text,
  wordMs = 70,
  className,
  onDone,
  onSpoken,
}: {
  text: string;
  wordMs?: number;
  className?: string;
  onDone?: () => void;
  /** Called when the line has been said out loud (or straight away when the agent is silent). */
  onSpoken?: () => void;
}) {
  // Translate the whole sentence before it is split into words (word spans can't be translated one by one).
  const t = useT();
  const said = t(text);
  const words = said.split(" ");
  const [shown, setShown] = useState(0);
  useEffect(() => {
    // The agent says it out loud too; screens that move on wait for the voice, not just the words.
    let alive = true;
    speak(said).then(() => { if (alive) onSpoken?.(); });
    setShown(0);
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setShown(i);
      if (i >= words.length) {
        clearInterval(id);
        onDone?.();
      }
    }, wordMs);
    return () => { alive = false; clearInterval(id); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [said]);
  return (
    <p className={className} aria-label={said} data-no-translate>
      {words.map((w, i) => (
        <span key={i} aria-hidden="true" className={cn("inline", i < shown ? "word-in" : "opacity-0")}>
          {w}
          {i < words.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}

/** Elapsed timer since the report was opened. Target under 10 minutes. */
export function useElapsed(startAt: number) {
  const [now, setNow] = useState(startAt);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((now - startAt) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function Timer({ value }: { value: string }) {
  return (
    <div className="flex h-10 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[13px] font-semibold" aria-label={`Elapsed ${value} of a 10 minute target`} data-hide-web>
      <svg viewBox="0 0 24 24" className="size-3.5 text-text-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      {value}
      <span className="text-text-2">/10:00</span>
    </div>
  );
}

export const Icon = {
  mic: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>,
  close: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>,
  keyboard: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="6" width="18" height="12" rx="3" /><path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" /></svg>,
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5 10 17 19 7" /></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>,
  camera: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>,
  note: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h14v16H5zM9 9h6M9 13h6" /></svg>,
  phone: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" /></svg>,
  undo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></svg>,
  edit: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z" /></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12 20 4l-6 16-3-7z" /></svg>,
  clip: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m20 11-8.5 8.5a5 5 0 0 1-7-7L13 4a3.3 3.3 0 0 1 4.7 4.7l-8.6 8.6a1.7 1.7 0 0 1-2.4-2.4L15 7.5" /></svg>,
  doc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5M10 13h6M10 17h6" /></svg>,
  play: <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg>,
  shield: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3 5 6v6c0 4 3 7.5 7 9 4-1.5 7-5 7-9V6z" /></svg>,
};
