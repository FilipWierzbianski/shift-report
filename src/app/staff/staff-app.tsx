"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Agent } from "@/components/agent/agent";
import { Icon, IconButton, Label, Pill } from "@/components/kit";
import { PersonaShell } from "@/components/persona-shell";
import { addLateReport, loadClosed, removeLateReport, saveBarAnswer } from "@/lib/session";
import { useT } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Role = "security" | "bar";
type Step = "home" | "camera" | "describe" | "sent";

const ROLE = {
  security: {
    name: "Mike",
    where: "Door",
    time: "01:42",
    tags: ["Fight", "Injury", "Ejected", "Refused entry", "Police", "Other"],
    urgentTags: ["Fight", "Injury", "Police"],
    preset: ["Fight", "Injury"],
    said: "Fight at the bar end, glass broken, one guest cut his hand. Got his name in my log.",
    earlier: [{ t: "23:15", text: "Refused entry · 2 guests, too drunk", status: "Seen by Sam 23:16 · in tonight’s report" }],
  },
  bar: {
    name: "Ola",
    where: "Bar",
    time: "00:31",
    tags: ["Stock out", "Breakage", "Void / comp", "Spill", "Complaint", "Other"],
    urgentTags: ["Breakage"],
    preset: ["Stock out"],
    said: "IPA keg kicked, switched tap 4 to lager.",
    earlier: [{ t: "22:05", text: "Ice machine slow, topped up from cellar", status: "Seen by Sam 22:09 · on Tom’s list" }],
    quick: ["Stock out", "Breakage", "Void / comp"],
  },
} as const;

export function StaffApp() {
  const sp = useSearchParams();
  const role: Role = sp.get("role") === "bar" ? "bar" : "security";
  const r = ROLE[role];
  const [step, setStep] = useState<Step>((sp.get("step") as Step) ?? "home");
  const [photo, setPhoto] = useState(sp.get("step") === "describe" && role === "security");
  const [tags, setTags] = useState<string[]>(sp.get("step") ? [...r.preset] : []);
  const [said, setSaid] = useState(sp.get("step") === "describe" ? r.said : "");
  const [listening, setListening] = useState(false);
  const [guest, setGuest] = useState(sp.get("step") === "describe" && role === "security" ? "Liam Hart" : "");
  const [camera, setCamera] = useState<number | null>(sp.get("step") === "describe" && role === "security" ? 3 : null);
  const injury = role === "security" && tags.some((t) => t === "Fight" || t === "Injury");
  // Ola's follow-ups: one tap each, so Tom's and Sam's tasks have a named source.
  const [spare, setSpare] = useState<"yes" | "no" | null>(null);
  const [till, setTill] = useState<number | null>(null);
  const [hurt, setHurt] = useState<"no" | "yes" | null>(null);
  const [fromQuick, setFromQuick] = useState(false);
  const [asked, setAsked] = useState(false); // Sam asked the bar about the 23:40 cancellations
  const [answered, setAnswered] = useState(false);
  const [closedNow, setClosedNow] = useState(false); // Sam has closed tonight's report
  const [lateId, setLateId] = useState<string | null>(null);
  useEffect(() => {
    if (role !== "bar") return;
    const report = loadClosed();
    setClosedNow(Boolean(report));
    setAsked(Boolean(report?.extras.some((e) => e.text.startsWith("Till 2"))));
    // After close (03:12) her own 00:31 report is already in the list.
    if (report)
      setSentList((xs) =>
        xs.some((x) => x.t === "00:31")
          ? xs
          : [{ t: "00:31", text: "IPA keg kicked, switched tap 4 to lager. No spare in the cellar", status: "Seen by Sam 00:33 · on Tom’s list" }, ...xs],
      );
  }, [role]);
  const BAR_SAID: Record<string, string> = {
    "Stock out": "IPA keg kicked, switched tap 4 to lager.",
    Breakage: "Dropped a tray of glasses behind the bar, swept up.",
    "Void / comp": "Voided a round, the guest changed the order.",
  };
  const sayFor = role === "bar" ? BAR_SAID[tags[0]] ?? r.said : r.said;
  const t = useT();
  const now = role === "bar" && closedNow ? "03:12" : r.time;
  const late = role === "bar" && closedNow; // Sam's report is already closed
  // Stock, voids and breakages go out as "Bar", not her name; only an injury names her, as a witness.
  const reportText = () =>
    [(said || tags.join(", ")).replace(/\.$/, ""), till ? `till ${till}` : "", spare === "no" ? "no spare" : spare === "yes" ? "spare in cellar" : "", hurt === "yes" ? "someone hurt" : ""]
      .filter(Boolean)
      .join(" · ");
  const lateEntry = (id: string) => ({
    id,
    t: now,
    who: hurt === "yes" ? "Reported by Ola" : "Bar",
    urgent,
    hurt: hurt === "yes",
    text: reportText(),
  });
  const quickStart = (t: string) => {
    setTags([t]); setSaid(""); setSpare(null); setTill(null); setHurt(null); setPhoto(false);
    setFromQuick(true); setStep("describe"); setListening(true);
  };
  // "Anyone hurt? Yes" makes any bar report urgent: Sam is notified and an incident is started.
  const urgent = tags.some((t) => (r.urgentTags as readonly string[]).includes(t)) || hurt === "yes";

  useEffect(() => {
    if (!listening) return;
    const words = t(sayFor).split(" ");
    let k = 0;
    const id = setInterval(() => {
      k += 1;
      setSaid(words.slice(0, k).join(" "));
      if (k >= words.length) { clearInterval(id); setListening(false); }
    }, 110);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  const [sentList, setSentList] = useState<{ t: string; text: string; status: string }[]>(() => [...r.earlier]);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    if (step !== "sent") { setSeen(false); return; }
    const t = setTimeout(() => setSeen(true), 1600);
    return () => clearTimeout(t);
  }, [step]);

  const toggle = (t: string) => setTags((xs) => (xs.includes(t) ? xs.filter((x) => x !== t) : [...xs, t]));

  return (
    <PersonaShell persona={role}>
      <div key={step} className="screen-in absolute inset-0 flex flex-col">
        {step === "home" && (
          <div className="relative flex h-full flex-col overflow-hidden px-5 pb-8 pt-6">
            <div className="rays" />
            <header className="relative flex items-center justify-between">
              <div>
                <Label>On shift · {r.where}</Label>
                <p className="text-[22px] font-bold tracking-[-0.02em]">Hi {r.name}</p>
              </div>
              <span className="rounded-full bg-surface px-3.5 py-2 text-[13px] font-semibold">{now}</span>
            </header>
            {role === "bar" && asked && !answered && (
              <div className="relative mt-4 flex flex-col gap-2 rounded-[20px] bg-surface p-4">
                <Label className="text-ai">Sam asks the bar · managers only, not the team chat</Label>
                <p className="text-[15px] font-semibold leading-snug">Till 2 cancelled 6 items around 23:40. Do you know why?</p>
                <div className="flex flex-wrap gap-1.5">
                  {["Wrong round, remade it", "Guest changed the order", "Not me, don’t know"].map((a) => (
                    <button key={a} type="button" onClick={() => { setAnswered(true); saveBarAnswer(a); toast("Sent to Sam and the morning handover"); }} className="h-11 rounded-xl bg-surface-2 px-3 text-[13px] font-semibold">{a}</button>
                  ))}
                </div>
              </div>
            )}
            {role === "bar" ? (
              <div className="relative flex flex-1 flex-col justify-end gap-3 py-5">
                {!asked && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                    <Agent variant="ribbons" state="idle" className="h-24 w-full" />
                    <p className="max-w-[240px] text-sm text-body">Tap a tile and talk. I’ll ask one follow-up at most.</p>
                  </div>
                )}
                <Label>What happened? One tap, then say it</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLE.bar.quick.map((t) => (
                    <button key={t} type="button" onClick={() => quickStart(t)} className="flex h-28 flex-col justify-between rounded-[22px] bg-text-1 p-4 text-left text-ai-ink active:scale-[0.98]">
                      <span className="size-6">{Icon.mic}</span>
                      <span className="text-[17px] font-bold">{t}</span>
                    </button>
                  ))}
                  <button type="button" onClick={() => setStep("camera")} className="flex h-28 flex-col justify-between rounded-[22px] bg-surface-2 p-4 text-left">
                    <span className="size-6">{Icon.camera}</span>
                    <span className="text-[17px] font-bold">Something else</span>
                  </button>
                </div>
              </div>
            ) : (
            <div className="relative flex flex-1 flex-col items-center justify-center gap-5">
              <button
                type="button"
                onClick={() => setStep("camera")}
                className="grid size-56 place-items-center rounded-full bg-text-1 text-ai-ink transition-transform active:scale-95"
                aria-label="Report something"
              >
                <span className="flex flex-col items-center gap-2">
                  <span className="size-12 [&_svg]:size-12">{Icon.camera}</span>
                  <span className="text-[19px] font-bold">Report something</span>
                </span>
              </button>
              <p className="max-w-[260px] text-center text-sm text-body">One tap, or double-tap the back of your phone. Photo or voice, no typing.</p>
            </div>
            )}
            <div className="relative flex flex-col gap-2">
              <Label>Sent tonight</Label>
              {sentList.map((e, k) => (
                <div key={`${e.t}-${k}`} className="flex flex-col gap-0.5 rounded-2xl bg-surface px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3"><span>{e.text}</span><span className="text-text-2">{e.t}</span></div>
                  <span className="flex items-center gap-1.5 text-xs text-text-2"><span className="size-3 text-text-1">{Icon.check}</span>{e.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "camera" && (
          <div className="relative flex h-full flex-col bg-black">
            {/* Stub viewfinder: real file handling is out of scope. */}
            <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
              <div className="absolute left-[10%] top-[30%] h-40 w-64 rounded-full bg-[#5a4a2a] opacity-40 blur-3xl" />
              <div className="absolute right-[5%] top-[55%] h-32 w-40 rounded-full bg-[#3a4a5a] opacity-40 blur-3xl" />
              <div className="absolute inset-x-0 bottom-[28%] h-24 bg-gradient-to-t from-[#2a2418] to-transparent opacity-80" />
              <div className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/40" />
            </div>
            <header className="relative flex items-center justify-between px-5 pt-6">
              <IconButton onClick={() => setStep("home")} aria-label="Cancel" className="bg-black/40 backdrop-blur">{Icon.close}</IconButton>
              <span className="rounded-full bg-black/40 px-3 py-1.5 text-xs font-semibold backdrop-blur">{r.where} · {now}</span>
              <span className="w-11" />
            </header>
            <div className="relative mt-auto flex items-center justify-between px-8 pb-10">
              <button type="button" onClick={() => { setPhoto(false); setStep("describe"); }} className="w-20 text-left text-[13px] font-semibold text-body">
                No photo, just say it
              </button>
              <button type="button" onClick={() => { setPhoto(true); setStep("describe"); }} aria-label="Take photo" className="grid size-20 place-items-center rounded-full border-4 border-white/80">
                <span className="size-16 rounded-full bg-white" />
              </button>
              <span className="w-20" />
            </div>
          </div>
        )}

        {step === "describe" && (
          <>
            <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-6">
              <IconButton onClick={() => setStep(fromQuick ? "home" : "camera")} aria-label="Back">{Icon.back}</IconButton>
              <span className="text-[13px] font-semibold">What happened?</span>
              <span className="w-11" />
            </header>
            <div className="no-scrollbar flex flex-1 flex-col gap-4 overflow-y-auto overflow-x-hidden px-5 pb-4 pt-2">
              {photo ? (
                <div className="relative h-40 overflow-hidden rounded-[18px] bg-[#1d1a14]" aria-label="Photo taken at the bar end">
                  <div className="absolute left-6 top-6 h-24 w-40 rounded-full bg-[#5a4a2a] opacity-50 blur-2xl" />
                  <span className="absolute bottom-3 left-3 rounded-lg bg-black/50 px-2 py-1 text-[11px] font-semibold">Photo · {now}</span>
                </div>
              ) : (
                <button type="button" onClick={() => setStep("camera")} className="flex h-14 items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-line-dashed text-sm font-semibold text-body hover:text-text-1">
                  <span className="size-5">{Icon.camera}</span>Add photo (optional)
                </button>
              )}
              <div className="flex flex-col gap-2">
                <Label>Tap what fits</Label>
                <div className="flex flex-wrap gap-2">
                  {r.tags.map((t) => (
                    <button
                      key={t}
                      type="button"
                      aria-pressed={tags.includes(t)}
                      onClick={() => toggle(t)}
                      className={cn("h-11 rounded-xl px-4 text-sm font-semibold", tags.includes(t) ? "bg-text-1 text-ai-ink" : "bg-surface text-text-1")}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Label>Say it in a few words</Label>
                <div className="flex items-center gap-3 rounded-[20px] bg-surface p-3">
                  <button
                    type="button"
                    onClick={() => { setSaid(""); setListening(true); }}
                    aria-label="Record a voice note"
                    className={cn("grid size-14 shrink-0 place-items-center rounded-2xl [&_svg]:size-6", listening ? "bg-ai text-ai-ink" : "bg-surface-2 text-text-1")}
                  >
                    {Icon.mic}
                  </button>
                  {listening || said ? (
                    <p className="text-[15px] leading-snug">{said}{listening && <span className="text-text-2">…</span>}</p>
                  ) : (
                    <p className="text-sm text-text-2">Tap and talk. Names, times, cameras help most.</p>
                  )}
                  {listening && <Agent variant="ribbons" state="listening" className="ml-auto h-8 w-16 shrink-0" />}
                </div>
              </div>
              {injury && (
                <div className="flex flex-col gap-2">
                  <Label>The two things insurers ask for</Label>
                  <div className="overflow-hidden rounded-[20px] bg-surface">
                    <div className="flex items-center gap-3 border-b border-surface-2 px-4 py-3">
                      <span className="w-24 shrink-0 text-[13px] text-text-2">Guest’s name</span>
                      {guest ? (
                        <span className="flex-1 text-[15px] font-semibold">{guest}</span>
                      ) : (
                        <button type="button" onClick={() => setGuest("Liam Hart")} className="flex h-11 flex-1 items-center gap-2 rounded-xl bg-surface-2 px-3 text-[13px] font-semibold">
                          <span className="size-4">{Icon.mic}</span>Say it
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-3 px-4 py-3">
                      <span className="w-24 shrink-0 text-[13px] text-text-2">Camera</span>
                      <div className="flex flex-1 gap-1.5">
                        {[1, 2, 3, 4].map((c) => (
                          <button key={c} type="button" aria-pressed={camera === c} onClick={() => setCamera(c)} className={cn("h-11 flex-1 rounded-xl text-[15px] font-bold", camera === c ? "bg-text-1 text-ai-ink" : "bg-surface-2")}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {role === "bar" && tags.length > 0 && (
                <div className="flex flex-col gap-2">
                  <Label className="text-ai">Agent asks · so nobody has to chase you</Label>
                  <div className="flex items-center gap-3 rounded-[20px] bg-surface px-4 py-3">
                    <span className="flex-1 text-[14px]">
                      {tags.includes("Stock out") ? "Spare in the cellar?" : tags.includes("Void / comp") ? "Which till?" : "Anyone hurt?"}
                    </span>
                    {tags.includes("Stock out") &&
                      (["yes", "no"] as const).map((x) => (
                        <button key={x} type="button" aria-pressed={spare === x} onClick={() => setSpare(x)} className={cn("h-11 w-14 rounded-xl text-sm font-bold", spare === x ? "bg-text-1 text-ai-ink" : "bg-surface-2")}>{x === "yes" ? "Yes" : "No"}</button>
                      ))}
                    {tags.includes("Void / comp") && !tags.includes("Stock out") &&
                      [1, 2, 3].map((x) => (
                        <button key={x} type="button" aria-pressed={till === x} onClick={() => setTill(x)} className={cn("h-11 w-11 rounded-xl text-sm font-bold", till === x ? "bg-text-1 text-ai-ink" : "bg-surface-2")}>{x}</button>
                      ))}
                    {!tags.includes("Stock out") && !tags.includes("Void / comp") &&
                      (["no", "yes"] as const).map((x) => (
                        <button key={x} type="button" aria-pressed={hurt === x} onClick={() => setHurt(x)} className={cn("h-11 w-14 rounded-xl text-sm font-bold", hurt === x ? "bg-text-1 text-ai-ink" : "bg-surface-2")}>{x === "yes" ? "Yes" : "No"}</button>
                      ))}
                  </div>
                  {spare === "no" && <p className="text-[13px] text-ai">Got it: Tom will see “order a keg, no spare in the cellar”.</p>}
                  {hurt === "yes" ? (
                    <p className="text-[13px] text-body">Someone hurt: this goes out as reported by you, so Sam can follow up.</p>
                  ) : (tags.includes("Void / comp") || tags.includes("Breakage")) && (
                    <p className="text-[13px] text-body">Voids and breakages are logged against the till and the bar, not your name.</p>
                  )}
                </div>
              )}
              {urgent && (
                <div className="flex items-center gap-3 rounded-[18px] bg-attention/15 px-4 py-3">
                  <span className="size-2 shrink-0 rounded-full bg-attention" aria-hidden="true" />
                  <p className="text-sm"><b className="font-semibold text-attention">Sam gets this now.</b> <span className="text-body">{role === "bar" ? (hurt === "yes" ? "Someone is hurt, so the manager is notified straight away." : "Broken glass is a safety risk, so it notifies the manager straight away.") : "Injuries and fights notify the manager straight away."}</span></p>
                </div>
              )}
            </div>
            <div className="border-t border-white/5 bg-sheet px-5 pb-6 pt-3">
              <Pill
                className="w-full"
                disabled={!tags.length && !said}
                onClick={() => {
                  if (late) { const id = `${Date.now()}`; setLateId(id); addLateReport(lateEntry(id)); }
                  setStep("sent");
                }}
              >
                <span className="size-5">{Icon.send}</span>Send to Sam
              </Pill>
            </div>
          </>
        )}

        {step === "sent" && (
          <div className="relative flex h-full flex-col items-center justify-center gap-4 overflow-hidden px-8 text-center">
            <div className="rays" />
            <span className="relative grid size-20 place-items-center rounded-full bg-text-1 text-ai-ink [&_svg]:size-9">{Icon.check}</span>
            <h1 className="relative text-[26px] font-bold tracking-[-0.02em]">Sent to Sam</h1>
            <p className="relative text-[15px] text-body">
              {late && hurt === "yes"
                ? "Sam was notified now. Her report closed at 03:09, so she adds this as an incident; Dana and Tom see it in the morning."
                : late && urgent
                ? "Sam was notified now. Her report closed at 03:09, so Tom sees it in the morning handover."
                : late
                ? "Sam closed tonight’s report at 03:09, so this goes straight to Tom’s morning handover."
                : urgent ? "Sam was notified now." : "It’ll be waiting in tonight’s report."}{" "}
              {role === "bar" && tags.includes("Stock out")
                ? spare === "no" ? "Tom sees it in tomorrow’s handover, so the keg gets ordered." : "It goes on Tom’s list for the morning."
                : ""}{" "}
              {hurt === "yes" ? "Sam may ask you who was hurt." : "You won’t be asked to write it up again."}
            </p>

            {injury && (
              <div className="relative flex w-full flex-col gap-0 overflow-hidden rounded-2xl bg-surface text-left text-sm">
                <span className="flex items-center gap-2 border-b border-surface-2 px-4 py-3"><span className="size-4">{Icon.check}</span>{seen ? "Seen by Sam · 01:43" : "Delivered"}</span>
                <span className="border-b border-surface-2 px-4 py-3 text-body">
                  {t("Goes into the incident record: {0}.", [guest && t("guest’s name ({0})", guest), camera && t("camera {0}", camera), photo && t("your photo")].filter(Boolean).join(", ") || t("your words"))}
                  {!guest && ` ${t("Sam will ask for the guest’s name.")}`}
                </span>
                {camera ? <span className="px-4 py-3 text-body">{`Your Sunday shift: export the camera ${camera} clip`}</span> : null}
              </div>
            )}
            <div className="relative mt-4 flex w-full flex-col gap-2">
              <Pill className="w-full" onClick={() => {
                setSentList((xs) => [{ t: now, text: role === "bar"
                    ? reportText()
                    : [tags.join(", "), photo ? "photo" : ""].filter(Boolean).join(" · ") || said, status: late && hurt === "yes" ? "Sam notified 03:12 · incident to add" : late && urgent ? "Sam notified 03:12 · in Tom’s handover" : late ? "Sent after the report closed · in Tom’s handover" : injury ? "Seen by Sam 01:43 · in the incident record" : urgent ? "Seen by Sam · in tonight’s report" : "Delivered · in tonight’s report" }, ...xs]);
                setStep("home"); setTags([]); setSaid(""); setGuest(""); setCamera(null); setPhoto(false);
                setSpare(null); setTill(null); setHurt(null); setFromQuick(false);
              }}>Back to the {r.where.toLowerCase()}</Pill>
              <Pill variant="ghost" size="md" onClick={() => { if (late && lateId) removeLateReport(lateId); toast("Report withdrawn"); setStep("describe"); }}>Undo</Pill>
            </div>
          </div>
        )}
      </div>
    </PersonaShell>
  );
}
