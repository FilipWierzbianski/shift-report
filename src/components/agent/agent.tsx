"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export type AgentState = "idle" | "listening" | "thinking" | "speaking" | "done";
export type AgentVariant = "rings" | "ribbons";

// Motion targets per state. Phase is integrated every frame, so a speed change
// never jumps: the agent eases from slow to fast like something alive.
const TARGET: Record<AgentState, { speed: number; amp: number; focus: number }> = {
  idle: { speed: 0.22, amp: 0.1, focus: 0 },
  listening: { speed: 0.45, amp: 0.45, focus: 0 },
  thinking: { speed: 1.5, amp: 0.15, focus: 1 },
  speaking: { speed: 0.9, amp: 0.85, focus: 0 },
  // The night is closed: the ribbons settle into one calm line.
  done: { speed: 0.12, amp: 0.035, focus: 0 },
};

// Agent colours follow the design tokens (--bt-ai, --bt-text-1) as inherited by the canvas,
// so the "Aa" panel recolours it live and a parent can scope its own palette.
type Palette = { core: number[]; mid: number[]; deep: number[]; bg: string; at: number };
const newPalette = (): Palette => ({ core: [245, 243, 236], mid: [200, 242, 78], deep: [169, 204, 65], bg: "#0c0c06", at: -1e9 });
let LIME: Palette = newPalette();
let BG = "#0c0c06";

function hexToRgb(v: string): number[] | null {
  const m = v.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function refreshPalette(pal: Palette, el: Element, now: number) {
  if (now - pal.at < 400) return;
  pal.at = now;
  const cs = getComputedStyle(el);
  const ai = hexToRgb(cs.getPropertyValue("--bt-ai"));
  const core = hexToRgb(cs.getPropertyValue("--bt-text-1"));
  const bg = cs.getPropertyValue("--bt-bg").trim();
  if (ai) { pal.mid = ai; pal.deep = ai.map((c) => Math.round(c * 0.85)); }
  if (core) pal.core = core;
  if (hexToRgb(bg)) pal.bg = bg;
}

type Motion = { speed: number; amp: number; focus: number; phase: number; t: number };

function envelope(state: AgentState, t: number, level?: number) {
  const a = TARGET[state].amp;
  if (state === "listening" && typeof level === "number") return a * (0.25 + level);
  if (state === "speaking") {
    const syll = Math.max(0, Math.sin(t * 9.5 + Math.sin(t * 2.3) * 2));
    const phrase = Math.sin(t * 0.9) > -0.55 ? 1 : 0.15;
    return a * (0.25 + 0.75 * syll * (0.6 + 0.4 * Math.sin(t * 1.7))) * phrase;
  }
  if (state === "listening") {
    const n = Math.abs(Math.sin(t * 6.1) * Math.sin(t * 2.7 + 1) + 0.4 * Math.sin(t * 11.3));
    return a * (0.3 + 0.7 * n) * (Math.sin(t * 0.7) > -0.3 ? 1 : 0.2);
  }
  if (state === "idle") return a * (0.6 + 0.4 * Math.sin(t * 0.8));
  return a;
}

const rgba = (c: number[], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function rot3(p: [number, number, number], ax: number, ay: number, az: number): [number, number, number] {
  let [x, y, z] = p;
  let c = Math.cos(ax), s = Math.sin(ax);
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(ay); s = Math.sin(ay);
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(az); s = Math.sin(az);
  [x, y] = [x * c - y * s, x * s + y * c];
  return [x, y, z];
}

// BodyTrack glow: the same path drawn wider by 14 / 9 / 5 px at low opacity, then the core line.
function glowStroke(ctx: CanvasRenderingContext2D, path: Path2D, w: number, strength: number) {
  const k = 2.6 * strength;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = rgba(LIME.deep, 0.025 * k); ctx.lineWidth = w * 15; ctx.stroke(path);
  ctx.strokeStyle = rgba(LIME.mid, 0.04 * k); ctx.lineWidth = w * 10; ctx.stroke(path);
  ctx.strokeStyle = rgba(LIME.mid, 0.06 * k); ctx.lineWidth = w * 6; ctx.stroke(path);
  ctx.strokeStyle = rgba(LIME.core, Math.min(1, 0.7 * strength)); ctx.lineWidth = w * 1.1; ctx.stroke(path);
}

function drawRings(ctx: CanvasRenderingContext2D, w: number, h: number, S: Motion, transparent: boolean) {
  ctx.globalCompositeOperation = "source-over";
  if (transparent) ctx.clearRect(0, 0, w, h);
  else { ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h); }
  ctx.globalCompositeOperation = "lighter";
  const size = Math.min(w, h);
  const R = size * 0.3, cx = w / 2, cy = h / 2, u = Math.max(0.6, size / 400);
  const rings = size < 80 ? 4 : 7;
  for (let i = 0; i < rings; i++) {
    const dir = i % 2 ? 1 : -1;
    const tilt = 1 - 0.75 * S.focus;
    const ax = (0.9 + i * 0.42) * tilt + S.phase * 0.35 * dir;
    const ay = i * 0.9 * tilt + S.phase * (0.5 + 0.12 * i);
    const az = S.phase * 0.18 + i * 0.45;
    const rr = R * (1 + S.amp * 0.09 * Math.sin(S.phase * 5 + i * 1.7));
    const path = new Path2D();
    for (let j = 0; j <= 72; j++) {
      const a = (j / 72) * Math.PI * 2;
      const p = rot3([Math.cos(a) * rr, Math.sin(a) * rr, 0], ax, ay, az);
      if (j) path.lineTo(cx + p[0], cy + p[1]);
      else path.moveTo(cx + p[0], cy + p[1]);
    }
    glowStroke(ctx, path, (size < 80 ? 1.3 : 1.2) * u, 0.5 + S.amp * 0.6);
  }
}

const RIBBONS = [
  { yo: -0.06, A: 0.16, k: 1.6, ps: 0.9, A2: 0.05, k2: 3.1, ps2: 0.6, W: 0.14, kw: 1.3, off: 0 },
  { yo: 0.04, A: 0.12, k: 2.1, ps: -0.7, A2: 0.04, k2: 2.6, ps2: 1.1, W: 0.1, kw: 1.8, off: 2.1 },
  { yo: 0, A: 0.2, k: 1.2, ps: 0.5, A2: 0.06, k2: 3.7, ps2: -0.8, W: 0.07, kw: 2.4, off: 4.2 },
];

function drawRibbons(ctx: CanvasRenderingContext2D, w: number, h: number, S: Motion, transparent: boolean) {
  ctx.globalCompositeOperation = "source-over";
  if (transparent) ctx.clearRect(0, 0, w, h);
  else { ctx.fillStyle = BG; ctx.fillRect(0, 0, w, h); }
  ctx.globalCompositeOperation = "lighter";
  const u = Math.max(1, w / 700), cy = h / 2, STR = h < 80 ? 10 : 26, STEP = Math.max(5, w / 80);
  for (const r of RIBBONS) {
    const amp = 1 + S.amp * 1.1;
    const conv = 1 - 0.8 * S.focus;
    const pts: [number, number, number][] = [];
    for (let x = -STEP; x <= w + STEP; x += STEP) {
      const X = (x / w) * Math.PI * 2;
      const y = cy + h * (r.yo * conv + (r.A * Math.sin(r.k * X + S.phase * r.ps * 2 + r.off) * conv + r.A2 * Math.sin(r.k2 * X + S.phase * r.ps2 * 3 + r.off) * S.amp) * amp * 0.6);
      const wd = h * r.W * (0.35 + 0.65 * Math.sin(r.kw * X + S.phase * 1.4 + r.off)) * (0.8 + S.amp * 0.5);
      pts.push([x, y, wd]);
    }
    for (let s = 0; s < STR; s++) {
      const t = s / (STR - 1) - 0.5;
      const edge = Math.pow(Math.abs(t) * 2, 6);
      const path = new Path2D();
      pts.forEach(([x, y, wd], j) => (j ? path.lineTo(x, y + t * wd) : path.moveTo(x, y + t * wd)));
      ctx.lineWidth = u;
      ctx.strokeStyle = rgba(edge > 0.5 ? LIME.core : LIME.mid, (0.035 + 0.35 * edge) * (0.6 + S.amp * 0.5));
      ctx.stroke(path);
    }
    const spine = new Path2D();
    pts.forEach(([x, y], j) => (j ? spine.lineTo(x, y) : spine.moveTo(x, y)));
    ctx.strokeStyle = rgba(LIME.mid, 0.03 * (0.6 + S.amp)); ctx.lineWidth = 30 * u; ctx.stroke(spine);
    ctx.strokeStyle = rgba(LIME.mid, 0.04 * (0.6 + S.amp)); ctx.lineWidth = 14 * u; ctx.stroke(spine);
  }
}

export function Agent({
  variant,
  state,
  level,
  className,
  transparent = true,
  label,
}: {
  variant: AgentVariant;
  state: AgentState;
  level?: number;
  className?: string;
  transparent?: boolean;
  label?: string;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ state, level });
  live.current = { state, level };

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const ctx = el.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const pal = newPalette();
    const S: Motion = { speed: TARGET[live.current.state].speed, amp: 0.1, focus: 0, phase: Math.random() * 10, t: 0 };
    let w = 0, h = 0, raf = 0, prev = performance.now(), visible = true;

    const resize = () => {
      const r = el.getBoundingClientRect();
      w = Math.max(1, Math.round(r.width * dpr));
      h = Math.max(1, Math.round(r.height * dpr));
      el.width = w; el.height = h;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;
      if (visible) {
        refreshPalette(pal, el, now);
        LIME = pal; // draw helpers read the current instance's palette
        BG = pal.bg;
        const { state: st, level: lv } = live.current;
        const tg = TARGET[st];
        const scale = reduce ? 0.25 : 1;
        S.t += dt;
        S.speed += (tg.speed * scale - S.speed) * Math.min(1, dt * 2.5);
        S.amp += (envelope(st, S.t, lv) * (reduce ? 0.4 : 1) - S.amp) * Math.min(1, dt * 9);
        S.focus += (tg.focus - S.focus) * Math.min(1, dt * 2);
        S.phase += dt * S.speed;
        if (variant === "rings") drawRings(ctx, w, h, S, transparent);
        else drawRibbons(ctx, w, h, S, transparent);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [variant, transparent]);

  return (
    <canvas
      ref={canvas}
      className={cn("block", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}
