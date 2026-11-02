"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Live design-token editor for the prototype: fonts, the 9 base colours, grain and light rays.
// Overrides live on <html> and in localStorage; "Save to code" writes style.json for Claude to bake in.

type Colors = {
  bg: string; surface: string; "surface-2": string; inset: string;
  "text-1": string; body: string; "text-2": string; ai: string; attention: string;
};
type Style = { body: string; heading: string; colors: Colors; grain: number; rays: number };

const FONTS: { name: string; weights: string }[] = [
  { name: "Figtree", weights: "" }, // self-hosted via next/font
  { name: "Manrope", weights: "400;500;600;700;800" },
  { name: "Geist", weights: "400;500;600;700;800" },
  { name: "Inter Tight", weights: "400;500;600;700;800" },
  { name: "DM Sans", weights: "400;500;600;700;800" },
  { name: "Plus Jakarta Sans", weights: "400;500;600;700;800" },
  { name: "Instrument Sans", weights: "400;500;600;700" },
  { name: "Sora", weights: "400;500;600;700;800" },
  { name: "Outfit", weights: "400;500;600;700;800" },
  { name: "Onest", weights: "400;500;600;700;800" },
  { name: "Hanken Grotesk", weights: "400;500;600;700;800" },
  { name: "Schibsted Grotesk", weights: "400;500;600;700;800" },
  { name: "Bricolage Grotesque", weights: "400;500;600;700;800" },
  { name: "Space Grotesk", weights: "400;500;600;700" },
  { name: "Archivo", weights: "400;500;600;700;800" },
  { name: "IBM Plex Sans", weights: "400;500;600;700" },
  { name: "JetBrains Mono", weights: "400;500;600;700;800" },
  { name: "Fraunces", weights: "400;500;600;700;800" },
  { name: "Anton", weights: "400" },
  { name: "Instrument Serif", weights: "400" },
];

const NOIR: Colors = {
  bg: "#101010", surface: "#1c1c1c", "surface-2": "#262626", inset: "#151515",
  "text-1": "#f4f4f1", body: "#b4b4ae", "text-2": "#85857f", ai: "#dcdcd4", attention: "#d5e085",
};

const PRESETS: { name: string; style: Style }[] = [
  { name: "Studio noir", style: { body: "Figtree", heading: "Figtree", colors: NOIR, grain: 0.13, rays: 1.6 } },
];

const DEFAULT = PRESETS[0].style;
const KEY = "bt-style-noir"; // new key: older saved BodyTrack tweaks don't leak into noir
const COLOR_LABELS: { key: keyof Colors; label: string; hint: string }[] = [
  { key: "bg", label: "Background", hint: "screen" },
  { key: "surface", label: "Surface", hint: "cards" },
  { key: "surface-2", label: "Surface 2", hint: "secondary buttons" },
  { key: "inset", label: "Inset", hint: "wells, data blocks" },
  { key: "text-1", label: "Text 1", hint: "headings, human actions" },
  { key: "body", label: "Body", hint: "running text" },
  { key: "text-2", label: "Text 2", hint: "labels, meta" },
  { key: "ai", label: "AI accent", hint: "agent, caught facts" },
  { key: "attention", label: "Attention", hint: "gaps, flags" },
];

const fontStack = (name: string) =>
  name === "Figtree" ? "var(--font-figtree), ui-sans-serif, system-ui, sans-serif" : `"${name}", ui-sans-serif, system-ui, sans-serif`;

function loadFont(name: string) {
  const f = FONTS.find((x) => x.name === name);
  if (!f || !f.weights) return;
  const id = `bt-font-${name.replace(/\s+/g, "-")}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${name.replace(/\s+/g, "+")}:wght@${f.weights}&display=swap`;
  document.head.appendChild(link);
}

function luminance(hex: string) {
  const n = parseInt(hex.replace("#", ""), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

function isDefault(s: Style) {
  return JSON.stringify(s) === JSON.stringify(DEFAULT);
}

function cssFor(s: Style) {
  const c = s.colors;
  const vars: Record<string, string> = {
    ...Object.fromEntries(Object.entries(c).map(([k, v]) => [`--bt-${k}`, v])),
    // derived tokens, recomputed from the base colours
    "--bt-sheet": `color-mix(in oklab, ${c.bg} 55%, ${c.surface})`,
    "--bt-text-3": `color-mix(in oklab, ${c["text-2"]} 75%, ${c.bg})`,
    "--bt-line": `color-mix(in oklab, ${c.surface} 88%, ${c["text-1"]})`,
    "--bt-line-dashed": `color-mix(in oklab, ${c.surface} 72%, ${c["text-1"]})`,
    "--bt-bar-idle": `color-mix(in oklab, ${c["surface-2"]} 72%, ${c["text-1"]})`,
    "--bt-ai-pressed": `color-mix(in oklab, ${c.ai} 82%, black)`,
    "--bt-ai-ink": luminance(c["text-1"]) > 0.4 ? "#14140f" : "#ffffff",
    "--bt-font-body": fontStack(s.body),
    "--bt-font-heading": fontStack(s.heading),
    "--bt-grain": String(s.grain),
    "--bt-rays": String(s.rays),
  };
  return vars;
}

function apply(s: Style) {
  const root = document.documentElement;
  const vars = cssFor(s);
  if (isDefault(s)) {
    Object.keys(vars).forEach((k) => root.style.removeProperty(k));
  } else {
    loadFont(s.body);
    loadFont(s.heading);
    Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  }
}

// Typing a hex goes through a draft, so half-typed values don't fight the controlled colour.
function HexInput({ value, label, onChange }: { value: string; label: string; onChange: (v: string) => void }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      value={draft}
      onChange={(e) => {
        const v = e.target.value.trim();
        setDraft(v);
        const hex = v.startsWith("#") ? v : `#${v}`;
        if (/^#[0-9a-fA-F]{6}$/.test(hex)) onChange(hex.toLowerCase());
      }}
      onBlur={() => setDraft(value)}
      aria-label={`${label} hex`}
      spellCheck={false}
      className="h-11 w-24 rounded-xl bg-surface px-2 text-center font-mono text-[13px] text-text-1 outline-none ring-1 ring-white/10 focus:ring-text-1"
    />
  );
}

export function StylePanel() {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<Style>(DEFAULT);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setS({ ...DEFAULT, ...JSON.parse(saved) });
    } catch {}
  }, []);

  // On desktop the open panel pushes the page aside instead of covering the phone.
  useEffect(() => {
    document.documentElement.classList.toggle("bt-panel-open", open);
  }, [open]);

  useEffect(() => {
    apply(s);
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch {}
  }, [s]);

  const setColor = (k: keyof Colors, v: string) => setS((x) => ({ ...x, colors: { ...x.colors, [k]: v } }));
  const css = `:root {\n${Object.entries(cssFor(s)).map(([k, v]) => `  ${k}: ${v};`).join("\n")}\n}`;
  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(""), 2500); };

  const copy = async () => {
    try { await navigator.clipboard.writeText(css); flash("CSS copied"); } catch { flash("Copy failed. Select the text below."); }
  };
  const save = async () => {
    try {
      const r = await fetch("/api/style", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ style: s, css }) });
      flash(r.ok ? "Saved to style.json. Tell Claude to apply it." : "Save works only on the dev server");
    } catch { flash("Save failed"); }
  };

  const textOnBg = contrast(s.colors.body, s.colors.bg);
  const labelOnSurface = contrast(s.colors["text-2"], s.colors.surface);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Edit fonts and colours"
        className="fixed right-2 top-1/2 z-[100] grid size-11 -translate-y-1/2 place-items-center rounded-2xl border border-white/10 bg-surface-2/90 text-[16px] font-bold text-text-1 backdrop-blur hover:brightness-125 lg:bottom-5 lg:left-5 lg:right-auto lg:top-auto lg:size-12 lg:translate-y-0"
      >
        Aa
      </button>
      {open && (
        <aside className="fixed inset-y-0 right-0 z-[100] flex w-[360px] max-w-full flex-col gap-5 overflow-y-auto border-l border-white/10 bg-sheet p-5 text-text-1" aria-label="Style editor">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Fonts &amp; colours</h2>
            <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-xl px-3 text-sm font-semibold text-text-2 hover:text-text-1">Close</button>
          </div>

          <section className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-2">Presets</span>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => setS(p.style)}
                  className="flex h-14 items-center gap-2 rounded-xl bg-surface px-3 text-left text-[13px] font-semibold hover:bg-surface-2"
                >
                  <span className="flex shrink-0">
                    {[p.style.colors.bg, p.style.colors.surface, p.style.colors.ai, p.style.colors.attention].map((c) => (
                      <span key={c} className="-ml-1 size-4 rounded-full border border-black/30 first:ml-0" style={{ background: c }} />
                    ))}
                  </span>
                  {p.name}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-2">Typeface</span>
            {(["body", "heading"] as const).map((k) => (
              <label key={k} className="flex flex-col gap-1 text-sm" htmlFor={`font-${k}`}>
                <span className="text-body">{k === "body" ? "Text" : "Headings"}</span>
                <select
                  id={`font-${k}`}
                  value={s[k]}
                  onChange={(e) => setS((x) => ({ ...x, [k]: e.target.value }))}
                  className="h-11 rounded-xl bg-surface px-3 text-[15px] text-text-1 outline-none ring-1 ring-white/10 focus:ring-text-1"
                >
                  {FONTS.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
                </select>
              </label>
            ))}
            <p className="rounded-xl bg-inset px-3 py-2 text-[13px] text-body" style={{ fontFamily: fontStack(s.body) }}>
              <span className="block text-[20px] font-bold text-text-1" style={{ fontFamily: fontStack(s.heading) }}>Your night, drafted.</span>
              Till 2 cancelled 6 items around 23:40. £14,820 · 01:10
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-2">Colours</span>
            {COLOR_LABELS.map(({ key, label, hint }) => (
              <div key={key} className="flex items-center gap-3">
                <input
                  id={`c-${key}`}
                  type="color"
                  value={s.colors[key]}
                  onChange={(e) => setColor(key, e.target.value)}
                  className="size-11 shrink-0 cursor-pointer rounded-xl border border-white/10 bg-transparent p-1"
                  aria-label={`${label} colour`}
                />
                <label htmlFor={`c-${key}`} className="min-w-0 flex-1 text-sm">
                  <span className="block font-semibold">{label}</span>
                  <span className="block text-xs text-text-2">{hint}</span>
                </label>
                <HexInput value={s.colors[key]} label={label} onChange={(v) => setColor(key, v)} />
              </div>
            ))}
            <p className={cn("rounded-xl px-3 py-2 text-xs", textOnBg >= 4.5 && labelOnSurface >= 4.5 ? "bg-inset text-text-2" : "bg-attention/15 text-attention")}>
              Contrast: body on background {textOnBg.toFixed(1)}:1 · labels on cards {labelOnSurface.toFixed(1)}:1 {textOnBg >= 4.5 && labelOnSurface >= 4.5 ? "(WCAG AA ok)" : "(below 4.5:1, AA fails)"}
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-2">Effects</span>
            <label className="flex flex-col gap-1 text-sm" htmlFor="fx-grain">
              <span className="flex justify-between text-body"><span>Film grain</span><span>{Math.round(s.grain * 100)}%</span></span>
              <input id="fx-grain" type="range" min={0} max={0.2} step={0.01} value={s.grain} onChange={(e) => setS((x) => ({ ...x, grain: Number(e.target.value) }))} />
            </label>
            <label className="flex flex-col gap-1 text-sm" htmlFor="fx-rays">
              <span className="flex justify-between text-body"><span>Light rays</span><span>{Math.round(s.rays * 100)}%</span></span>
              <input id="fx-rays" type="range" min={0} max={2} step={0.1} value={s.rays} onChange={(e) => setS((x) => ({ ...x, rays: Number(e.target.value) }))} />
            </label>
          </section>

          <section className="mt-auto flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={save} className="h-12 rounded-full bg-text-1 text-sm font-bold text-ai-ink">Save to code</button>
              <button type="button" onClick={copy} className="h-12 rounded-full bg-surface-2 text-sm font-bold">Copy CSS</button>
            </div>
            <button type="button" onClick={() => setS(DEFAULT)} className="h-11 text-sm font-semibold text-text-2 hover:text-text-1">Reset to Studio noir</button>
            {msg && <p className="text-center text-xs text-body" role="status">{msg}</p>}
          </section>
        </aside>
      )}
    </>
  );
}
