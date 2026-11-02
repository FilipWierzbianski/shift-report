"use client";

import { useEffect } from "react";
import { hasPolish, toPolish, useLang } from "@/lib/i18n";

// Translates whatever React renders (text, placeholders, aria-labels, input values, toasts) while /pl is on.
// React keeps owning the DOM; when it writes English again, the observer translates it again.
//
// JSX like `Fill the {n} gaps` renders as three text nodes ("Fill the ", "4", " gaps"), so an element
// whose children are all text is translated as one sentence: the Polish goes into the first node and the
// rest are emptied. The English React last wrote is kept per node, so later updates still translate.

const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "NOSCRIPT"]);
const ATTRS = ["placeholder", "aria-label", "title", "alt"];
const english = new WeakMap<Text, string>();
const written = new WeakMap<Text, string>();

function sourceOf(t: Text) {
  const v = t.nodeValue ?? "";
  // If the node still holds what we wrote, React hasn't touched it: its English is the one we saved.
  return written.get(t) === v ? (english.get(t) ?? v) : v;
}

function write(t: Text, en: string, pl: string) {
  english.set(t, en);
  written.set(t, pl);
  if (t.nodeValue !== pl) t.nodeValue = pl;
}

function translateText(t: Text) {
  const parent = t.parentElement;
  if (!parent || SKIP.has(parent.tagName) || parent.closest("[data-no-translate]")) return;
  // Server-rendered HTML keeps <!-- --> markers between adjacent text nodes; they don't split a sentence.
  const kids = [...parent.childNodes].filter((k) => k.nodeType !== Node.COMMENT_NODE);
  if (kids.length > 1 && kids.every((k) => k.nodeType === Node.TEXT_NODE)) {
    const texts = kids as Text[];
    const en = texts.map(sourceOf);
    const whole = en.join("");
    if (hasPolish(whole)) {
      const pl = toPolish(whole);
      texts.forEach((k, i) => write(k, en[i], i === 0 ? pl : ""));
      return;
    }
    texts.forEach((k, i) => write(k, en[i], toPolish(en[i])));
    return;
  }
  const en = sourceOf(t);
  write(t, en, toPolish(en));
}

function translateEl(el: Element) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v) {
      const next = toPolish(v);
      if (next !== v) el.setAttribute(a, next);
    }
  }
  // Pre-filled edit fields (React sets .value, not text).
  if (el instanceof HTMLInputElement && el.type === "text" && el.value && !el.dataset.plDone) {
    const next = toPolish(el.value);
    el.dataset.plDone = "1";
    if (next !== el.value) {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
      setter?.call(el, next);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  }
}

function translateNode(node: Node) {
  if (node.nodeType === Node.TEXT_NODE) return translateText(node as Text);
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as Element;
  if (SKIP.has(el.tagName)) return;
  translateEl(el);
  el.childNodes.forEach(translateNode);
}

export function Translator() {
  const lang = useLang();
  useEffect(() => {
    document.documentElement.lang = lang;
    if (lang !== "pl") return;
    let mo: MutationObserver | null = null;
    const begin = () => {
      translateNode(document.body);
      mo = new MutationObserver((records) => {
        for (const r of records) {
          if (r.type === "characterData") translateText(r.target as Text);
          else if (r.type === "attributes") translateEl(r.target as Element);
          else {
            r.addedNodes.forEach(translateNode);
            // A removed or added sibling changes the sentence an all-text parent spells out.
            const first = [...r.target.childNodes].find((k) => k.nodeType === Node.TEXT_NODE);
            if (r.removedNodes.length && first) translateText(first as Text);
          }
        }
        // Our own writes queue records too; drop them so we never translate our own output.
        mo?.takeRecords();
      });
      mo.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    };
    // Start only once the page has hydrated; before that the DOM still belongs to the server HTML.
    if ((window as Window & { __btReady?: boolean }).__btReady) begin();
    else window.addEventListener("bt-ready", begin, { once: true });
    return () => {
      window.removeEventListener("bt-ready", begin);
      mo?.disconnect();
    };
  }, [lang]);
  return null;
}
