// Every line the agent says out loud, in English and Polish (Polish via the app's dictionary).
import * as N from "../../src/lib/night.ts";
import { readFileSync, writeFileSync } from "node:fs";

const APP = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");
const DICT: Record<string, string> = JSON.parse(readFileSync(`${APP}/src/lib/pl.json`, "utf8"));
const src = readFileSync(`${APP}/src/app/manager/manager-app.tsx`, "utf8");

// Same lookup as src/lib/i18n.ts (exact, then numbers as {0}, pounds → złoty).
const NUM = /£?−?\d+(?:[.,:]\d+)*(?:%|k\b)?/g;
const zloty = (tok: string) => {
  if (!tok.startsWith("£")) return tok;
  const k = tok.endsWith("k");
  const v = parseFloat(tok.slice(1, k ? -1 : undefined).replace(/,/g, "")) * (k ? 1000 : 1) * 5;
  if (k) return `${(v / 1000).toLocaleString("pl-PL", { maximumFractionDigits: 1 })} tys. zł`;
  return `${Math.round(v).toLocaleString("pl-PL", { useGrouping: true })} zł`;
};
const toPolish = (text: string) => {
  const key = text.replace(/\s+/g, " ").trim();
  if (DICT[key]) return DICT[key];
  const nums: string[] = [];
  const tpl = key.replace(NUM, (m) => `{${nums.push(m) - 1}}`);
  return nums.length && DICT[tpl] ? DICT[tpl].replace(/\{(\d+)\}/g, (_, i) => zloty(nums[Number(i)] ?? "")) : null;
};

const en = new Set<string>();
const add = (s?: string) => { if (s) en.add(s); };
["Tell me about the shift.", "Sorting your night into the report…", "We have the whole report. Decide if it’s right and whether we tell the team.", "What would you like to add?"].forEach(add);
Object.values(N.sectionPrompts).forEach(add);
N.recallQuestions.forEach((q) => add(q.text));
N.soloQuestions("guided").forEach((q) => add(q.text));
[...N.incidentFields, ...N.soloIncidentFields].forEach((f) => add(f.ask));
for (const m of src.matchAll(/\{ who: "agent", text: "([^"]+)" \}/g)) add(m[1]);

const out: { lang: string; text: string }[] = [];
const missing: string[] = [];
for (const s of en) {
  out.push({ lang: "en", text: s });
  const pl = toPolish(s);
  if (pl) out.push({ lang: "pl", text: pl }); else missing.push(s);
}
writeFileSync(new URL("lines.json", import.meta.url), JSON.stringify(out, null, 1));
console.log("lines:", out.length, "missing PL:", missing.length);
missing.forEach((m) => console.log(" -", m));
