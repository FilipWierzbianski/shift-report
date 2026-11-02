"use client";

import { useEffect, useSyncExternalStore, type CSSProperties } from "react";
import { useLang } from "@/lib/i18n";
import { DECK_CSS } from "./deck-css";
import { CHAPTERS, SLIDES, makeT, type T } from "./slides";

// Full-page slide deck for the Loom. One slide at a time on a 1920 × 1080 canvas scaled to the window.
// Keys: ← → ↑ ↓, PageUp/PageDown, Space (Shift+Space back), Home/End, F for full screen.
// The current slide lives in the hash (/deck#5 = slide 05), so a reload keeps the place.

const W = 1920;
const H = 1080;
const N = SLIDES.length;
const pad = (n: number) => String(n).padStart(2, "0");

function indexFromHash(): number {
  const v = parseInt(window.location.hash.slice(1), 10);
  return Number.isFinite(v) ? Math.min(Math.max(v, 1), N) - 1 : 0;
}

function go(i: number) {
  const j = Math.min(Math.max(i, 0), N - 1);
  if (window.location.hash === `#${j + 1}`) return;
  // replaceState: stepping through slides shouldn't fill the back button.
  window.history.replaceState(null, "", `#${j + 1}`);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

const listen = (type: "hashchange" | "resize") => (cb: () => void) => {
  window.addEventListener(type, cb);
  return () => window.removeEventListener(type, cb);
};
const onHash = listen("hashchange");
const onResize = listen("resize");
const fit = () => Math.min(window.innerWidth / W, window.innerHeight / H);

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  else document.documentElement.requestFullscreen().catch(() => {});
}

const Chevron = ({ back }: { back?: boolean }) => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d={back ? "M12.5 4 6.5 10l6 6" : "M7.5 4l6 6-6 6"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function TopBar({ chapter, t }: { chapter: number | null; t: T }) {
  return (
    <div className="fwd-top">
      <div className="fwd-logo" aria-label="Filip Wierzbiański">
        FW<span>®</span>
      </div>
      <div className={`fwd-ch${chapter === null ? " cover" : ""}`}>
        {CHAPTERS.map((c, n) => (
          <span key={c.en} className={n === chapter ? "on" : undefined}>
            [ 0{n + 1} ] {t(c.pl, c.en)}
          </span>
        ))}
      </div>
    </div>
  );
}

export function Deck() {
  const lang = useLang();
  const index = useSyncExternalStore(onHash, indexFromHash, () => -1);
  const k = useSyncExternalStore(onResize, fit, () => 0);
  const ready = index >= 0 && k > 0;
  const cur = Math.max(index, 0);
  const t = makeT(lang);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const now = indexFromHash();
      let next: number | null = null;
      switch (e.key) {
        case "ArrowRight":
        case "ArrowDown":
        case "PageDown":
          next = now + 1;
          break;
        case "ArrowLeft":
        case "ArrowUp":
        case "PageUp":
          next = now - 1;
          break;
        case " ":
          next = e.shiftKey ? now - 1 : now + 1;
          break;
        case "Home":
          next = 0;
          break;
        case "End":
          next = N - 1;
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          return;
      }
      if (next === null) return;
      e.preventDefault();
      go(next);
    };
    let x0 = 0;
    let y0 = 0;
    const touchStart = (e: TouchEvent) => {
      x0 = e.touches[0].clientX;
      y0 = e.touches[0].clientY;
    };
    const touchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - x0;
      const dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(indexFromHash() + (dx < 0 ? 1 : -1));
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", touchStart, { passive: true });
    window.addEventListener("touchend", touchEnd, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", touchStart);
      window.removeEventListener("touchend", touchEnd);
    };
  }, []);

  // Keep the slide when switching language: /pl and /en set the cookie and redirect to `next`.
  const back = encodeURIComponent(`/deck#${cur + 1}`);
  // Nav buttons don't keep focus after a click, so Space keeps meaning "next slide".
  const noFocus = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div
      className={`fwd${SLIDES[cur].light ? " is-light" : ""}${ready ? "" : " is-wait"}`}
      data-no-translate
      lang={lang}
      aria-roledescription="carousel"
      aria-label="Create Shift Report"
    >
      <style dangerouslySetInnerHTML={{ __html: DECK_CSS }} />
      <div className="fwd-canvas" style={{ "--k": k || 0.5 } as CSSProperties}>
        {SLIDES.map((s, j) => (
          <section
            key={s.id}
            className={`fwd-slide${s.light ? " light" : ""}${j === cur ? " is-on" : j < cur ? " is-before" : ""}`}
            inert={j !== cur}
            aria-hidden={j !== cur}
            aria-roledescription="slide"
            aria-label={`${pad(j + 1)} / ${pad(N)}`}
          >
            <s.Body t={t} lang={lang} />
          </section>
        ))}
        {/* One top bar over all slides: it stays put while the slides cross-fade, only the chapter changes. */}
        <TopBar chapter={SLIDES[cur].chapter} t={t} />
      </div>

      <nav className="fwd-nav" aria-label={t("Slajdy", "Slides")}>
        <button type="button" className="fwd-btn" onMouseDown={noFocus} onClick={() => go(cur - 1)} disabled={cur === 0} aria-label={t("Poprzedni slajd", "Previous slide")}>
          <Chevron back />
        </button>
        <span className="fwd-count" aria-live="polite">
          {pad(cur + 1)} / {pad(N)}
        </span>
        <button type="button" className="fwd-btn" onMouseDown={noFocus} onClick={() => go(cur + 1)} disabled={cur === N - 1} aria-label={t("Następny slajd", "Next slide")}>
          <Chevron />
        </button>
      </nav>

      <div className="fwd-lang" role="group" aria-label={t("Język", "Language")}>
        <a href={`/pl?next=${back}`} aria-current={lang === "pl" ? "true" : undefined}>
          PL
        </a>
        <span aria-hidden="true">|</span>
        <a href={`/en?next=${back}`} aria-current={lang === "en" ? "true" : undefined}>
          EN
        </a>
      </div>
    </div>
  );
}
