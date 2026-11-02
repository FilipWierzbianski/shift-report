"use client";

import { useEffect, useSyncExternalStore } from "react";
import pl from "./pl.json";

// Polish version of the prototype (/pl sets the cookie, /en clears it).
// Strings are looked up by their English text; numbers, times and amounts become {0}, {1}…
// so "Confirm 5 and continue" and "Confirm 3 and continue" share one entry.

export type Lang = "en" | "pl";

const DICT = pl as Record<string, string>;
const NUM = /£?−?\d+(?:[.,:]\d+)*(?:%|k\b)?/g;

function readLang(): Lang {
  if (typeof document === "undefined") return "en";
  return /(?:^|;\s*)lang=pl\b/.test(document.cookie) ? "pl" : "en";
}

function subscribe(cb: () => void) {
  window.addEventListener("bt-lang", cb);
  return () => window.removeEventListener("bt-lang", cb);
}

export function useLang(): Lang {
  return useSyncExternalStore(subscribe, readLang, () => "en");
}

// The Polish version is set in a Polish bar: pounds become złoty (about 5 zł to the pound, rounded).
const RATE = 5;
function zloty(tok: string): string {
  if (!tok.startsWith("£")) return tok;
  const k = tok.endsWith("k");
  const v = parseFloat(tok.slice(1, k ? -1 : undefined).replace(/,/g, "")) * (k ? 1000 : 1) * RATE;
  if (k) return `${(v / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} tys. zł`;
  return `${Math.round(v).toLocaleString("pl-PL", { useGrouping: true })} zł`;
}

function lookup(key: string): string | undefined {
  if (DICT[key]) return DICT[key];
  const nums: string[] = [];
  const template = key.replace(NUM, (m) => `{${nums.push(m) - 1}}`);
  if (!nums.length) return undefined;
  const fill = (s: string) => s.replace(/\{(\d+)\}/g, (_, i) => zloty(nums[Number(i)] ?? ""));
  if (DICT[template]) return fill(DICT[template]);
  // Just an amount or a time ("−£45", "▲ £12"): no words to translate, only the currency.
  if (!/[A-Za-z]/.test(template.replace(/\{\d+\}/g, "")) && nums.some((n) => n.startsWith("£"))) return fill(template);
  return undefined;
}

/** Is there a Polish entry for this exact sentence (numbers aside)? */
export function hasPolish(text: string): boolean {
  const key = text.replace(/\s+/g, " ").trim();
  return Boolean(key && lookup(key));
}

/** Translate one string (or text node content) to Polish; unknown strings come back unchanged. */
export function toPolish(text: string): string {
  const lead = text.match(/^\s*/)?.[0] ?? "";
  const trail = text.match(/\s*$/)?.[0] ?? "";
  const key = text.replace(/\s+/g, " ").trim();
  if (!key) return text;
  const hit = lookup(key);
  return hit ? lead + hit + trail : text;
}

/**
 * t("Removed “{0}”", title): the template is translated as a whole, then each argument
 * (translated too, if it's text with an entry) goes into its slot.
 */
export function useT() {
  const lang = useLang();
  return (s: string, ...args: (string | number)[]) => {
    const pl = lang === "pl";
    const out = pl ? (DICT[s] ?? toPolish(s)) : s;
    if (!args.length) return out;
    return out.replace(/\{(\d+)\}/g, (_, i) => {
      const a = args[Number(i)];
      return typeof a === "string" && pl ? toPolish(a) : String(a ?? "");
    });
  };
}

// The DOM translator must not touch server HTML before React hydrates it (that causes a mismatch).
// Pages call this; their effects run only after their own subtree has hydrated.
export function usePageReady() {
  useEffect(() => {
    (window as Window & { __btReady?: boolean }).__btReady = true;
    window.dispatchEvent(new Event("bt-ready"));
  }, []);
}
