// What Sam changed in her session (gap answers, corrections, recall extras), handed to the
// reader views. sessionStorage only: it's a prototype, and it must never break the page.

export type ClosedReport = {
  gaps: Record<string, string>;
  extras: { text: string; owner: string; due: string }[];
  // Sam's corrections ("about" = category of the line she corrected) and answers that aren't tasks.
  notes: { text: string; about?: string }[];
  closedIn: string;
  // Next-shift fixes Sam swapped: the AI's suggestion → her pick (null = no follow-up).
  changed?: Record<string, string | null>;
  // What she attached, by section (titles only; real files are out of scope).
  attached?: { reading: string; time: string; to: string }[];
};

const KEY = "shift-report:closed";
const NOTIFIED = "shift-report:notified";

function read<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export const saveClosed = (r: ClosedReport) => write(KEY, r);
export const loadClosed = () => read<ClosedReport>(KEY);

// Ola's private answer to Sam's question about the 23:40 cancellations.
export const saveBarAnswer = (text: string) => write("shift-report:bar-answer", { text });
export const loadBarAnswer = () => read<{ text: string }>("shift-report:bar-answer");

// Reports staff send after the manager closed the night: they go to the morning handover.
export type LateReport = { id: string; t: string; who: string; text: string; urgent?: boolean; hurt?: boolean };
export const addLateReport = (r: LateReport) => {
  const xs = read<LateReport[]>("shift-report:late") ?? [];
  if (!xs.some((x) => x.id === r.id)) write("shift-report:late", [...xs, r]);
};
export const loadLateReports = () => read<LateReport[]>("shift-report:late") ?? [];

export const removeLateReport = (id: string) =>
  write("shift-report:late", (read<LateReport[]>("shift-report:late") ?? []).filter((x) => x.id !== id));

// A new closing run starts clean, so a demo can be replayed in the same tab.
export function resetSession() {
  try {
    ["shift-report:closed", "shift-report:late", "shift-report:bar-answer", "shift-report:notified"].forEach((k) => sessionStorage.removeItem(k));
  } catch {}
}

// Dana's decision to notify the insurer, so the record can show who decided and when.
export const saveNotified = (at: string) => write(NOTIFIED, { at });
export const loadNotified = () => read<{ at: string }>(NOTIFIED);
