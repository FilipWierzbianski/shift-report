"use client";

import { useState } from "react";
import { AttachSheet, Thumb } from "@/components/attach";
import { Icon, Label } from "@/components/kit";
import { categories, sectionPrompts, type Attachment, type CategoryId, type FactRow, type IncidentField } from "@/lib/night";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// The report itself, section by section, as the brief lists them. Every section is optional:
// empty ones stay visible as a stub ("nothing tonight"), so the manager sees the whole shape
// without being made to fill it. Laptop: the right-hand panel. Phone: a short list on "caught".

export type Attached = { a: Attachment; to: CategoryId | "report" };

const MIN = ["when", "where", "type", "what"]; // the brief's minimum for every incident

export function ReportPanel({
  items,
  attached,
  hearing,
  incident,
  sent,
  onOpenIncident,
  onAdd,
  onAsk,
}: {
  items: FactRow[];
  attached: Attached[];
  hearing: Set<CategoryId>;
  incident: { fields: IncidentField[]; gaps: Record<string, string>; confirmed: boolean } | null;
  sent: string | null;
  onOpenIncident?: () => void;
  onAdd: (to: CategoryId | "report", items: Attachment[], note?: string) => void;
  onAsk?: (q: string) => void; // a section's helper question, asked by the agent in the conversation
}) {
  const t = useT();
  const [sheet, setSheet] = useState<CategoryId | "report" | null>(null);
  const live = items.filter((f) => f.status !== "rejected");
  const inSection = (id: CategoryId) => live.filter((f) => f.category === id);
  const filesFor = (id: CategoryId | "report") => attached.filter((x) => x.to === id);
  const filled = categories.filter((c) => inSection(c.id).length || filesFor(c.id).length).length;
  const gapsOpen = incident ? incident.fields.filter((f) => f.value === null && !incident.gaps[f.id]).length : 0;

  return (
    <div className="relative flex h-full flex-col">
      <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-10 pt-6">
        <div className="mx-auto flex max-w-[760px] flex-col gap-5">
          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Label>{sent ? t("Shift report · sent {0}", sent) : "Shift report · draft"}</Label>
              <h2 className="mt-1 text-[22px] font-semibold leading-tight tracking-[-0.02em]">Saturday 31 October</h2>
              <p className="text-sm text-text-2">Closing manager Sam Reyes · doors closed 03:00</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={() => setSheet("report")} className="flex h-10 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold ring-1 ring-white/12 hover:bg-white/5 [&_svg]:size-4">
                {Icon.clip}Attach
              </button>
            </div>
          </header>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-body">{t("{0} of {1} sections have something", filled, categories.length)}</span>
              <span className="text-text-2">Every section is optional</span>
            </div>
            <div className="flex gap-1" aria-hidden="true">
              {categories.map((c) => {
                const has = inSection(c.id).length > 0 || filesFor(c.id).length > 0;
                const done = has && inSection(c.id).every((f) => f.status === "confirmed");
                return <span key={c.id} className={cn("h-1.5 flex-1 rounded-full", hearing.has(c.id) ? "animate-pulse bg-ai" : done ? "bg-text-1" : has ? "bg-ai/60" : "bg-surface-2")} />;
              })}
            </div>
          </div>

          {filesFor("report").length > 0 && (
            <div className="flex flex-wrap items-center gap-2 rounded-[18px] bg-inset p-3">
              <Label className="mr-1">On the whole report</Label>
              {filesFor("report").map(({ a }) => <FileChip key={a.id} a={a} />)}
            </div>
          )}

          <ol className="flex flex-col gap-2">
            {categories.map((c, i) => {
              const rows = inSection(c.id);
              const fl = filesFor(c.id);
              const has = rows.length > 0 || fl.length > 0;
              const pending = rows.some((f) => f.status === "pending");
              const isIncident = c.id === "incidents" && rows.some((f) => f.incident);
              return (
                <li
                  key={c.id}
                  className={cn(
                    "rounded-[18px] px-4 py-3",
                    has ? "bg-surface" : "border-[1.5px] border-dashed border-line-dashed/70",
                    isIncident && !incident?.confirmed && "outline outline-[1.5px] outline-attention/60",
                  )}
                >
                  <div className="flex min-h-9 items-center gap-3">
                    <span className="w-5 text-[12px] tabular-nums text-text-3">{i + 1}</span>
                    <span className={cn("min-w-0 flex-1 truncate text-[15px] font-semibold", !has && "text-text-2")}>{c.label}</span>
                    {hearing.has(c.id) && <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-ai">Hearing it…</span>}
                    {has ? (
                      <span className={cn("rounded-lg px-2 py-0.5 text-[11px] font-bold", isIncident && !incident?.confirmed ? "bg-attention/15 text-attention" : pending ? "bg-ai/12 text-ai" : "bg-surface-2 text-text-1")}>
                        {isIncident && !incident?.confirmed ? (gapsOpen ? t("{0} details open", gapsOpen) : "To confirm") : pending ? "AI draft" : "Confirmed"}
                      </span>
                    ) : (
                      <span className="text-[12px] text-text-3">Nothing tonight · optional</span>
                    )}
                    <button type="button" onClick={() => setSheet(c.id)} aria-label={t("Add to {0}", c.label)} className="grid size-9 shrink-0 place-items-center rounded-xl text-text-2 hover:bg-white/5 hover:text-text-1 [&_svg]:size-4">
                      {has ? Icon.clip : Icon.plus}
                    </button>
                  </div>

                  {isIncident && incident && (
                    <div className="mt-2 flex flex-col gap-2 pl-8">
                      <div className="grid grid-cols-2 gap-1.5">
                        {MIN.map((id) => {
                          const f = incident.fields.find((x) => x.id === id);
                          const v = f ? (incident.gaps[id] ?? f.value) : null;
                          return (
                            <div key={id} className="min-w-0 rounded-xl bg-inset px-3 py-2">
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">
                                {v && <span className="size-3 text-text-1">{Icon.check}</span>}
                                {f?.label}
                              </span>
                              <p className="line-clamp-2 text-[13px] leading-snug">{v ?? "—"}</p>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[12px] text-text-2">
                        Time, place, type and description are the minimum for every incident.{" "}
                        {onOpenIncident && (
                          <button type="button" onClick={onOpenIncident} className="font-semibold text-text-1 underline underline-offset-2">
                            {incident.confirmed ? "Open the record" : "Finish the record"}
                          </button>
                        )}
                      </p>
                    </div>
                  )}

                  {!isIncident && rows.length > 0 && (
                    <ul className="mt-1 flex flex-col gap-1 pl-8">
                      {rows.map((f) => (
                        <li key={f.id} className="flex items-baseline justify-between gap-3 text-[14px] leading-snug">
                          <span className="min-w-0">{f.title}</span>
                          <span className="shrink-0 text-[12px] text-text-2">{f.edited || f.fromAnswer ? "You" : f.source.who}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {fl.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 pl-8">
                      {fl.map(({ a }) => <FileChip key={a.id} a={a} />)}
                    </div>
                  )}

                  {!isIncident && (
                    onAsk ? (
                      <button type="button" onClick={() => onAsk(sectionPrompts[c.id])} className="mt-0.5 min-h-8 pl-8 text-left text-[13px] text-text-3 transition-colors hover:text-text-2">
                        {sectionPrompts[c.id]}
                      </button>
                    ) : (
                      <p className="mt-0.5 pl-8 text-[13px] text-text-3">{sectionPrompts[c.id]}</p>
                    )
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      {sheet && <AttachSheet section={sheet === "report" ? undefined : sheet} onClose={() => setSheet(null)} onAdd={(xs, note) => onAdd(sheet, xs, note)} />}
    </div>
  );
}

export function FileChip({ a }: { a: Attachment }) {
  return (
    <span className="inline-flex h-11 max-w-full items-center gap-2 rounded-xl bg-inset pl-1 pr-3 text-[12px]">
      <Thumb a={a} className="size-9 shrink-0 rounded-lg" />
      <span className="min-w-0 truncate">
        <b className="font-semibold">{a.kind === "document" ? <span data-no-translate>{a.name}</span> : a.reading}</b>
        <span className="text-text-2"> · {a.time}</span>
      </span>
    </span>
  );
}

/** Phone: the sections nothing was said about, as a visible stub. Tap one to add a line or a file. */
export function ReportStub({ items, attached, onAdd }: { items: FactRow[]; attached: Attached[]; onAdd: (to: CategoryId, items: Attachment[], note?: string) => void }) {
  const [sheet, setSheet] = useState<CategoryId | null>(null);
  const live = items.filter((f) => f.status !== "rejected");
  const empty = categories.filter((c) => !live.some((f) => f.category === c.id) && !attached.some((x) => x.to === c.id));
  const t = useT();
  return (
    <>
      <div className="flex flex-col gap-2.5 rounded-[20px] border-[1.5px] border-dashed border-line-dashed/70 p-4">
        <div className="flex items-center justify-between">
          <Label>Rest of the report · {empty.length} empty</Label>
          <span className="text-[11px] text-text-2">all optional</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {empty.map((c) => (
            <button key={c.id} type="button" onClick={() => setSheet(c.id)} aria-label={t("Add to {0}", c.label)} className="inline-flex h-10 items-center gap-1 rounded-xl bg-inset px-3 text-[12px] font-semibold text-body hover:text-text-1 [&_svg]:size-3.5">
              {Icon.plus}{c.short}
            </button>
          ))}
        </div>
      </div>
      {sheet && <AttachSheet section={sheet} onClose={() => setSheet(null)} onAdd={(xs, note) => onAdd(sheet, xs, note)} />}
    </>
  );
}
