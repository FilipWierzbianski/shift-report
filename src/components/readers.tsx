"use client";

import { useEffect, useState } from "react";
import { loadBarAnswer, loadClosed, loadLateReports, loadNotified, saveNotified, type ClosedReport, type LateReport } from "@/lib/session";
import { Agent } from "@/components/agent/agent";
import { Icon, Label, SourceChip } from "@/components/kit";
import { PersonaShell } from "@/components/persona-shell";
import { toast } from "sonner";
import Link from "next/link";
import { auditTrail, digest, handover, incidentFields, insurerSource, venue } from "@/lib/night";
import { cn } from "@/lib/utils";


function useClosed() {
  const [r, setR] = useState<ClosedReport | null>(null);
  useEffect(() => setR(loadClosed()), []);
  return r;
}

function Mini() {
  return <Agent variant="ribbons" state="idle" className="h-7 w-14 rounded-lg" />;
}

// ---------------------------------------------------------------------------
// Tom, 11:00 — reads the handover.

export function HandoverView() {
  const closed = useClosed();
  const [done, setDone] = useState<string[]>([]);
  const [barAnswer, setBarAnswer] = useState<string | null>(null);
  const [late, setLate] = useState<LateReport[]>([]);
  useEffect(() => { setBarAnswer(loadBarAnswer()?.text ?? null); setLate(loadLateReports()); }, []);
  // "Don't know" is an answer, but it doesn't close the question.
  const answered = Boolean(barAnswer && !/don.?t know/i.test(barAnswer));
  // Fixes Sam swapped for the AI's suggestion ("caught" screen) replace it here; null = she dropped it.
  const changed = closed?.changed ?? {};
  const swapped = (text: string) => (text in changed ? changed[text] : text);
  const open = [
    ...handover.open.map((o) => ({ ...o, text: swapped(o.text) ?? "", mine: o.text in changed })),
    ...(closed?.extras ?? []).filter((e) => !handover.open.some((o) => o.text === e.text)).map((e) => ({ ...e, mine: false })),
  ].filter((o) => o.text && !(answered && o.text.startsWith("Till 2")));
  const top = handover.top
    .map((line, i) => {
      const from = handover.topFrom[i];
      return from && from in changed ? { text: changed[from] ?? "", mine: true, i } : { text: line, mine: false, i };
    })
    .filter((x) => x.text);
  // A correction sits under the task about the same line (IPA = stock, till 2 short = cash, glass = none).
  // Everything else, e.g. what the 23:40 cancellations were, goes to "Also from Sam".
  const topFacts = ["inventory", "bar", ""];
  const notes = closed?.notes ?? [];
  const notesFor = (i: number) => notes.filter((n) => topFacts[i] && n.about === topFacts[i]).map((n) => n.text);
  const loose = notes.filter((n) => !n.about || !topFacts.includes(n.about)).map((n) => n.text);
  return (
    <PersonaShell persona="opener">
      <div className="screen-in no-scrollbar absolute inset-0 overflow-y-auto overflow-x-hidden px-5 pb-8 pt-6">
        <header className="flex items-center gap-2.5">
          <Mini />
          <span className="text-[13px] font-semibold text-body">Handover from Sam · 03:09</span>
        </header>
        <h1 className="mt-4 text-[28px] font-bold leading-[1.12] tracking-[-0.03em]">{top.length === 3 ? "Morning, Tom. Three things before you open." : top.length === 2 ? "Morning, Tom. Two things before you open." : "Morning, Tom. One thing before you open."}</h1>
        <ol className="mt-5 flex flex-col gap-2">
          {top.map(({ text, mine, i }, k) => (
            <li key={text} className="flex gap-3 rounded-[20px] bg-surface p-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-inset text-sm font-extrabold">{k + 1}</span>
              <div className="flex flex-col gap-1">
                <p className="text-[15px] leading-snug">{text}</p>
                {mine && <p className="text-[12px] text-text-2">Sam’s fix, instead of the AI’s suggestion</p>}
                {notesFor(i).map((n) => (
                  <p key={n} className="text-[13px] text-body"><span className="font-semibold text-text-1">Sam:</span> {n}</p>
                ))}
              </div>
            </li>
          ))}
        </ol>
        {late.length > 0 && (
          <div className="mt-2 flex flex-col gap-1 rounded-[20px] bg-surface p-4">
            <Label>Late from the bar · after the report closed</Label>
            {late.map((l, i) => (
              <p key={i} className="flex items-start gap-2 text-sm text-body">
                {l.urgent && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-attention" aria-label="Urgent" />}
                <span>{l.t} · {l.who}: {l.text}{l.hurt ? `. Sam notified ${l.t}, not yet in an incident record.` : l.urgent ? `. Sam notified ${l.t}.` : ""}</span>
              </p>
            ))}
          </div>
        )}
        {barAnswer && (
          <div className="mt-2 flex flex-col gap-1 rounded-[20px] bg-inset p-4">
            <Label>From the bar team · 03:12</Label>
            <p className="text-sm text-body">On the 23:40 cancellations on till 2: {barAnswer.toLowerCase()}.</p>
          </div>
        )}
        {loose.length > 0 && (
          <div className="mt-2 flex flex-col gap-1 rounded-[20px] bg-inset p-4">
            <Label>Also from Sam</Label>
            {loose.map((n) => <p key={n} className="text-sm text-body">{n}</p>)}
          </div>
        )}
        <div className="mt-6 flex items-center justify-between">
          <Label>Open items · {open.length - done.length} left</Label>
        </div>
        <div className="mt-2 overflow-hidden rounded-[20px] bg-surface">
          {open.map((o, i) => {
            const on = done.includes(o.text);
            return (
              <button
                key={o.text}
                type="button"
                aria-pressed={on}
                onClick={() => setDone((d) => (on ? d.filter((x) => x !== o.text) : [...d, o.text]))}
                className={cn("flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-surface-2", i < open.length - 1 && "border-b border-surface-2")}
              >
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-md [&_svg]:size-4", on ? "bg-text-1 text-ai-ink" : "border-[1.5px] border-line-dashed")}>{on && Icon.check}</span>
                <span className={cn("flex-1 text-[14px]", on && "text-text-2 line-through")}>{o.text}{o.mine && <span className="text-text-2"> · Sam’s fix</span>}</span>
                <span className="text-xs text-text-2">{o.owner} · {o.due}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-6 flex flex-col gap-2 rounded-[20px] bg-inset p-4">
          <Label>Also last night</Label>
          <p className="text-sm text-body">One incident at 01:40 (fight, minor cut, first aid given). Recorded and sent to Dana, who decides on notifying the insurer. {late.some((l) => l.hurt) ? "A late bar report (someone hurt) is not yet in an incident record; check the bar is safe before open." : "Nothing for you to do except check the glass station."}</p>

          <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm text-text-2">
            {handover.quiet.map((q) => <li key={q}>{q}</li>)}
          </ul>
        </div>
      </div>
    </PersonaShell>
  );
}

// ---------------------------------------------------------------------------
// Dana, 09:00 — morning digest across venues, with patterns.

export function OwnerView() {
  const closed = useClosed();
  const tillNote = closed?.notes.find((n) => n.about === "bar")?.text;
  const [lateUrgent, setLateUrgent] = useState<LateReport[]>([]);
  useEffect(() => setLateUrgent(loadLateReports().filter((l) => l.hurt)), []);
  const [notified, setNotified] = useState<string | null>(null);
  useEffect(() => setNotified(loadNotified()?.at ?? null), []);
  const notify = () => {
    const at = "09:12";
    saveNotified(at);
    setNotified(at);
    toast("Insurer notified. Logged as your decision, D. Kerr 09:12");
  };
  return (
    <PersonaShell persona="owner">
      <div className="screen-in no-scrollbar absolute inset-0 overflow-y-auto overflow-x-hidden px-5 pb-8 pt-6">
        <header className="flex items-center gap-2.5">
          <Mini />
          <span className="text-[13px] font-semibold text-body">Morning digest · Sun 1 Nov</span>
        </header>
        <h1 className="mt-4 text-[28px] font-bold leading-[1.12] tracking-[-0.03em]">
          {lateUrgent.length ? "All 3 venues reported. One late report needs a record." : "All 3 venues closed and reported."}
        </h1>
        <div className="mt-5 flex flex-col gap-3 rounded-[20px] border-[1.5px] border-dashed border-attention/70 bg-surface p-4">
          <Label className="text-attention">Pattern · needs a decision</Label>
          <p className="text-[16px] font-semibold leading-snug">{digest.pattern}</p>
          <p className="text-[13px] text-body">Agent depth at the Copper Room is now <b className="font-semibold text-text-1">thorough</b>: after a brain-dump, 3 recall questions on a night with an incident and 2 on a quiet one; one more each when the manager asks to be guided.</p>
          <div className="flex flex-wrap gap-2">
            {notified ? (
              <span className="inline-flex h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold text-text-2"><span className="size-4 text-text-1">{Icon.check}</span>Insurer notified {notified}</span>
            ) : (
              <button type="button" onClick={notify} className="h-11 rounded-xl bg-surface-2 px-4 text-[13px] font-semibold">Notify insurer</button>
            )}
            <button type="button" onClick={() => toast("Rota updated: 3rd door supervisor on Saturdays, 00:30–02:30")} className="h-11 rounded-xl bg-text-1 px-4 text-[13px] font-bold text-ai-ink">Add door staff 00:30–02:30</button>
            <span className="inline-flex h-11 items-center rounded-xl px-3 text-[13px] text-text-2">Camera 3 clip: Mike, Sun shift</span>
          </div>
        </div>
        {lateUrgent.length > 0 && (
          <div className="mt-5 flex flex-col gap-1 rounded-[20px] bg-surface p-4">
            <Label className="text-attention">After close · Copper Room</Label>
            {lateUrgent.map((l, i) => <p key={i} className="text-sm text-body">{l.t} · {l.who}: {l.text}. Sam notified {l.t}, not yet in an incident record.</p>)}
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => toast("Asked Sam to add an incident record before noon")} className="h-11 rounded-xl bg-text-1 px-4 text-[13px] font-bold text-ai-ink">Ask Sam for a record</button>
            </div>
          </div>
        )}
        <div className="mt-5 flex flex-col gap-2 rounded-[20px] bg-inset p-4">
          <Label>Your actions · 1</Label>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[15px]">Raise DJ lateness with the promoter <span className="text-text-2">· 50 min late, 2nd time</span></p>
            <button type="button" onClick={() => toast("Draft email to the promoter opened")} className="h-11 shrink-0 rounded-xl bg-surface-2 px-4 text-[13px] font-semibold">Draft</button>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2">
          {digest.venues.map((v) => (
            <div key={v.name} className="rounded-[20px] bg-surface p-4">
              <div className="flex items-center justify-between">
                <p className="text-[16px] font-bold">{v.name}</p>
                {v.incidents > 0 && <Link href="/insurer" className="inline-flex h-11 items-center rounded-xl bg-attention/15 px-3 text-[12px] font-bold text-attention hover:bg-attention/25">{v.incidents} incident · record ›</Link>}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2">
                <div><Label>Revenue</Label><p className="text-[17px] font-extrabold tracking-tight">{v.revenue}</p><p className="text-xs text-text-2">{v.delta}</p></div>
                <div><Label>Variance</Label><p className="text-[17px] font-extrabold tracking-tight">{v.variance}</p>{v.name === "The Copper Room" && tillNote && <p className="text-xs leading-snug text-body">Sam: {tillNote}</p>}</div>
                <div><Label>Report</Label><p className="text-xs leading-snug text-body">{v.status}</p></div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-text-2">Lowlight’s manager didn’t open the app. The agent called at 03:15 and filed it by voice.</p>
      </div>
    </PersonaShell>
  );
}

// ---------------------------------------------------------------------------
// Insurer — formal incident record with an honest audit trail.

const filled: Record<string, string> = { other: "Ejected, not identified", injury: "Small cut, right hand", ambulance: "Offered, refused", cctv: "Not known" };

export function InsurerView() {
  const closed = useClosed();
  const answers = closed ? Object.entries(closed.gaps).filter(([id]) => incidentFields.find((f) => f.id === id)?.value === null) : null;
  const corrections = closed ? Object.entries(closed.gaps).filter(([id, val]) => { const f = incidentFields.find((x) => x.id === id); return f?.value && f.value !== val; }) : [];
  const [notified, setNotified] = useState<string | null>(null);
  useEffect(() => setNotified(loadNotified()?.at ?? null), []);
  const base = auditTrail.map((a) =>
    a.t === "03:08" && answers
      ? {
          ...a,
          text:
            `Duty manager S. Reyes answered ${answers.length} gap${answers.length === 1 ? "" : "s"}` +
            (answers.some(([, v]) => v === "Not known") ? `, ${answers.filter(([, v]) => v === "Not known").length} as not known` : "") +
            (corrections.length ? `, corrected ${corrections.length} AI line${corrections.length === 1 ? "" : "s"}` : ""),
        }
      : a,
  );
  const trail = notified ? [...base, { t: notified, text: "Owner D. Kerr decided to notify the insurer and sent this record" }] : base;
  return (
    <PersonaShell persona="insurer">
      <div className="screen-in no-scrollbar absolute inset-0 overflow-y-auto overflow-x-hidden px-5 pb-8 pt-6">
        <header className="flex items-center justify-between">
          <span className="text-[13px] font-semibold text-body">Incident record</span>
          <span className="rounded-full bg-surface px-3 py-1.5 text-xs font-semibold">CR-2026-1031-01</span>
        </header>
        <div className={cn("mt-4 rounded-2xl px-4 py-3 text-[13px] font-semibold", notified ? "bg-surface" : "bg-attention/15 text-attention")}>
          {notified ? `Sent to the insurer ${notified} by owner D. Kerr` : "Draft record · not sent. The owner decides whether to notify the insurer."}
        </div>
        <h1 className="mt-4 text-[24px] font-bold leading-[1.15] tracking-[-0.02em]">Altercation with minor injury, {venue.name}</h1>
        <p className="mt-1 text-sm text-text-2">Sun 1 Nov 2026, 01:40 (Saturday night trading) · confirmed by the duty manager 03:09</p>
        <div className="mt-5 overflow-hidden rounded-[20px] bg-surface">
          {incidentFields.map((f, i) => {
            const sam = closed?.gaps[f.id];
            const corrected = Boolean(f.value && sam && sam !== f.value);
            const v = corrected ? sam! : f.value ?? sam ?? filled[f.id];
            const unknown = v === "Not known";
            return (
              <div key={f.id} className={cn("grid grid-cols-[96px_1fr] gap-3 px-4 py-3", i < incidentFields.length - 1 && "border-b border-surface-2")}>
                <Label className="pt-0.5">{f.label}</Label>
                <div className="flex flex-col gap-1">
                  <p className={cn("text-[14px] leading-snug", unknown && "text-attention")}>
                    {unknown
                      ? f.id === "cctv" ? "Camera 3 (per M. Adeyemi, 01:42). Clip export not confirmed at time of report." : "Not known at time of report"
                      : v}
                  </p>
                  {corrected ? (
                    <span className="text-[11px] leading-snug text-text-2">Corrected by duty manager S. Reyes. AI draft was: “{f.value}”</span>
                  ) : f.value ? (
                    <span className="text-[11px] leading-snug text-text-2"><span className="font-semibold text-ai">AI draft</span> from {insurerSource[f.source ?? ""] ?? f.source} · accepted with the record by S. Reyes, 03:09</span>
                  ) : (
                    <span className="text-[11px] font-semibold text-text-2">Entered by duty manager S. Reyes, 03:08</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {(closed?.attached ?? []).filter((x) => x.to === "incidents").length > 0 && (
          <div className="mt-5 flex flex-col gap-2">
            <Label>Evidence added by the duty manager</Label>
            <div className="overflow-hidden rounded-[20px] bg-surface">
              {(closed?.attached ?? []).filter((x) => x.to === "incidents").map((x) => (
                <p key={x.reading + x.time} className="px-4 py-3 text-[14px]">{x.reading} · {x.time}</p>
              ))}
            </div>
          </div>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <Label>Audit trail</Label>
          <div className="overflow-hidden rounded-[20px] bg-inset">
            {trail.map((a, i) => (
              <div key={a.t + i} className={cn("grid grid-cols-[52px_1fr] gap-2 px-4 py-2.5 text-[13px]", i < trail.length - 1 && "border-b border-surface")}>
                <span className="font-semibold">{a.t}</span>
                <span className="text-body">{a.text}</span>
              </div>
            ))}
          </div>
          <p className="text-xs leading-relaxed text-text-2">
            Every line says whether it was drafted by AI (and from which named source) or entered by a person, so it survives a black-and-white print. Attachments: 1 photo, 2 voice transcripts.
          </p>
        </div>
      </div>
    </PersonaShell>
  );
}
