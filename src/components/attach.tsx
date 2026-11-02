"use client";

import { useState } from "react";
import { Icon, Pill } from "@/components/kit";
import { cameraRoll, categories, files, type Attachment, type CategoryId } from "@/lib/night";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Attaching evidence: tonight's camera roll (filtered to the shift) and files, to the whole report
// or to one section. Real file handling is out of scope (brief), so the roll is a fixed set of photos.

export const sectionLabel = (id: CategoryId) => categories.find((c) => c.id === id)?.label ?? id;
export const sectionShort = (id: CategoryId) => categories.find((c) => c.id === id)?.short ?? id;

// What the camera "takes" in the prototype: the bar end after the clean-up.
const fresh: Attachment = { id: "p-now", kind: "photo", src: "/photos/glass.jpg", time: "03:06", reading: "Bar end after the clean-up", category: "incidents" };

export function Thumb({ a, className }: { a: Attachment; className?: string }) {
  if (a.kind === "document") {
    return (
      <span className={cn("grid place-items-center rounded-xl bg-surface-2 text-text-2 [&_svg]:size-5", className)} aria-hidden="true">
        {Icon.doc}
      </span>
    );
  }
  return (
    <span className={cn("relative block overflow-hidden rounded-xl bg-inset", className)} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={a.src} alt="" className={cn("size-full object-cover", a.id === "p-now" && "brightness-125 contrast-90")} />
      {a.kind === "video" && (
        <span className="absolute inset-0 grid place-items-center bg-black/25 text-white [&_svg]:size-4">{Icon.play}</span>
      )}
    </span>
  );
}

export function AttachSheet({
  section,
  onClose,
  onAdd,
}: {
  section?: CategoryId;
  onClose: () => void;
  onAdd: (items: Attachment[], note?: string) => void;
}) {
  const t = useT();
  const [tab, setTab] = useState<"media" | "files">("media");
  const [picked, setPicked] = useState<string[]>([]);
  const [roll, setRoll] = useState<Attachment[]>(cameraRoll);
  const [shooting, setShooting] = useState(false);
  const [note, setNote] = useState("");
  const all = [...roll, ...files];
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const count = picked.length + (note.trim() ? 1 : 0);
  const shoot = () => {
    setShooting(false);
    setRoll((r) => (r.some((x) => x.id === fresh.id) ? r : [fresh, ...r]));
    setPicked((p) => (p.includes(fresh.id) ? p : [...p, fresh.id]));
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col justify-end bg-black/60" role="dialog" aria-modal="true" aria-label={section ? t("Add to {0}", sectionLabel(section)) : t("Add to the report")}>
      <button type="button" className="flex-1 cursor-default" onClick={onClose} aria-label="Close" />
      <div className="sheet-in flex max-h-[88%] flex-col gap-3 rounded-t-[28px] border-t border-white/10 bg-sheet px-4 pb-5 pt-3">
        <div className="mx-auto h-1 w-10 rounded-full bg-surface-2" aria-hidden="true" />
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-[17px] font-semibold">{section ? t("Add to {0}", sectionLabel(section)) : t("Add to the report")}</p>
            <p className="text-[12px] text-text-2">Tonight · 18:00–03:00</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-surface text-text-1 [&_svg]:size-[18px]">{Icon.close}</button>
        </div>

        {section && (
          <input
            id="section-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write a line (optional)"
            aria-label="Write a line"
            className="h-12 rounded-2xl bg-surface px-4 text-[15px] outline-none ring-1 ring-white/10 placeholder:text-text-2 focus:ring-text-1"
          />
        )}

        <div className="inline-flex w-fit gap-0.5 rounded-full bg-surface p-1" role="tablist">
          {(["media", "files"] as const).map((k) => (
            <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={cn("h-9 rounded-full px-4 text-[13px] font-semibold", tab === k ? "bg-text-1 text-ai-ink" : "text-text-2 hover:text-text-1")}>
              {k === "media" ? "Photos & videos" : "Files"}
            </button>
          ))}
        </div>

        <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
          {tab === "media" ? (
            shooting ? (
              <div className="relative overflow-hidden rounded-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={fresh.src} alt="Camera viewfinder" className="aspect-[3/4] w-full object-cover brightness-110" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10">
                  <button type="button" onClick={() => setShooting(false)} className="h-11 px-2 text-[13px] font-semibold text-white">Cancel</button>
                  <button type="button" onClick={shoot} aria-label="Take the photo" className="size-16 rounded-full border-4 border-white bg-white/30" />
                  <span className="w-14" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                <button type="button" onClick={() => setShooting(true)} className="flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-xl bg-surface text-[12px] font-semibold text-body hover:bg-surface-2 [&_svg]:size-6">
                  {Icon.camera}Camera
                </button>
                {roll.map((a) => {
                  const n = picked.indexOf(a.id);
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => toggle(a.id)}
                      aria-pressed={n >= 0}
                      aria-label={t("{0} · {1}", a.reading, a.time)}
                      className={cn("relative aspect-[3/4] overflow-hidden rounded-xl ring-2 transition", n >= 0 ? "ring-text-1" : "ring-transparent")}
                    >
                      <Thumb a={a} className="size-full rounded-none" />
                      <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                        {a.kind === "video" ? `▶ ${a.length}` : a.time}
                      </span>
                      <span className={cn("absolute right-1.5 top-1.5 grid size-6 place-items-center rounded-full text-[12px] font-bold", n >= 0 ? "bg-text-1 text-ai-ink" : "border-2 border-white/80 bg-black/20")}>
                        {n >= 0 ? n + 1 : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="overflow-hidden rounded-2xl bg-surface">
              {files.map((a, i) => {
                const on = picked.includes(a.id);
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => toggle(a.id)}
                    aria-pressed={on}
                    className={cn("flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-surface-2", i < files.length - 1 && "border-b border-surface-2")}
                  >
                    <Thumb a={a} className="size-10 shrink-0" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-semibold" data-no-translate>{a.name}</span>
                      <span className="block truncate text-[12px] text-text-2">{a.time} · {a.reading}</span>
                    </span>
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full [&_svg]:size-3.5", on ? "bg-text-1 text-ai-ink" : "border-2 border-line-dashed")}>{on && Icon.check}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <Pill
          className="w-full"
          disabled={count === 0}
          onClick={() => {
            onAdd(all.filter((a) => picked.includes(a.id)), note.trim() || undefined);
            onClose();
          }}
        >
          {count === 0 ? t("Pick photos, videos or files") : count === 1 ? t("Add 1 item") : t("Add {0} items", count)}
        </Pill>
      </div>
    </div>
  );
}
