"use client";

import Link from "next/link";
import { Toaster } from "sonner";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { personaById, shownPersonas, type PersonaId } from "@/lib/personas";
import { LangSwitch } from "@/components/lang-switch";
import { usePageReady } from "@/lib/i18n";
import { setVoice, useVoice } from "@/lib/voice";
import { cn } from "@/lib/utils";

/**
 * Desktop: persona sheet on the left, the phone in the middle. For Sam (the manager) the default
 * desktop view is the laptop (brief: she finishes the night at a laptop): the flow on the left,
 * the report growing on the right. ?device=phone shows the same flow on her phone.
 * Phone width: the phone is the whole screen, persona sheet becomes a slim bar.
 * Under the device: "Behind this screen", the notes for reviewers (never inside the product).
 */
export function PersonaShell({
  persona,
  children,
  report,
  sidebar,
  webTop,
  reportBadge,
}: {
  persona: PersonaId;
  children: ReactNode;
  report?: ReactNode;
  reportBadge?: string;
  sidebar?: ReactNode;
  webTop?: ReactNode;
}) {
  usePageReady();
  const sp = useSearchParams();
  // The report waits, folded away on the right: the conversation is the centre.
  const [reportOpen, setReportOpen] = useState(false);
  // The agent's band spans the whole conversation pane (CSS reads --pane-w).
  const ro = useRef<ResizeObserver | null>(null);
  const paneRef = useCallback((el: HTMLDivElement | null) => {
    ro.current?.disconnect();
    if (!el) return;
    ro.current = new ResizeObserver(() => el.style.setProperty("--pane-w", `${el.clientWidth}px`));
    ro.current.observe(el);
  }, []);
  const laptop = Boolean(report) && sp.get("device") !== "phone";

  const toaster = (
    <Toaster
      theme="dark"
      // Top of the screen, under the top bar: answers and actions live at the bottom.
      position="top-center"
      offset={{ top: 84 }}
      mobileOffset={{ top: 84 }}
      toastOptions={{
        duration: 2500,
        style: {
          background: "var(--bt-surface-2)",
          border: "1px solid rgba(245,243,236,0.09)",
          color: "var(--bt-text-1)",
          fontFamily: "var(--bt-font-body)",
          borderRadius: 16,
        },
      }}
    />
  );

  if (laptop) {
    // One tree for both sizes (the flow must mount once). Below lg: the phone layout.
    // From lg up: Sam's web app on the office laptop, a classic left menu, the conversation
    // with the agent, and the report growing next to it.
    return (
      <div className="min-h-dvh bg-bg lg:flex lg:flex-col lg:gap-5 lg:px-8 lg:py-6">
        <MobileBar persona={persona} />
        <div className="hidden lg:block"><TopStrip persona={persona} /></div>
        <div className="h-[calc(100dvh-44px)] w-full lg:mx-auto lg:flex lg:h-[min(880px,calc(100dvh-140px))] lg:min-h-[660px] lg:max-w-[1440px] lg:flex-col lg:overflow-hidden lg:rounded-[22px] lg:bg-[#0a0a0a] lg:outline lg:outline-[10px] lg:outline-inset">
          <div className="hidden h-10 shrink-0 items-center gap-2 border-b border-white/5 px-4 lg:flex" aria-hidden="true">
            <span className="size-2.5 rounded-full bg-surface-2" />
            <span className="size-2.5 rounded-full bg-surface-2" />
            <span className="size-2.5 rounded-full bg-surface-2" />
            <span className="mx-auto rounded-lg bg-inset px-4 py-1 text-[12px] text-text-2">shiftreport.app/copper-room/tonight</span>
          </div>
          <div className="h-full lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-[256px_1fr] lg:gap-1 lg:p-2.5 lg:pl-1">
            <div className="hidden min-h-0 lg:flex lg:flex-col">{sidebar}</div>
            <div data-web data-look="noir" className="grain relative isolate flex h-full min-h-0 flex-col overflow-hidden bg-bg lg:rounded-[20px] lg:border lg:border-white/8">
              <div className="rays hidden lg:block" />
              {webTop && <div className="relative hidden shrink-0 lg:block">{webTop}</div>}
              <div
                className="relative min-h-0 flex-1 lg:grid lg:transition-[grid-template-columns] lg:duration-500 lg:ease-out"
                style={{ gridTemplateColumns: reportOpen ? "minmax(0,1fr) 480px" : "minmax(0,1fr) 0px" }}
              >
                <div ref={paneRef} data-phone className="relative h-full overflow-hidden [transform:translateZ(0)]">
                  <div className="relative mx-auto h-full w-full [container-type:inline-size] lg:max-w-[600px]">{children}</div>
                  {toaster}
                  {!reportOpen && (
                    <button
                      type="button"
                      onClick={() => setReportOpen(true)}
                      aria-label="Open the report"
                      className="absolute right-0 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-center gap-3 rounded-l-2xl border border-r-0 border-white/10 bg-surface px-2.5 py-4 text-[12px] font-semibold text-body hover:text-text-1 lg:flex"
                    >
                      <span className="[writing-mode:vertical-rl] rotate-180 tracking-wide">Report</span>
                      {reportBadge && <span className="rounded-md bg-surface-2 px-1 py-0.5 text-[11px] tabular-nums text-text-1">{reportBadge}</span>}
                      <span aria-hidden="true">‹</span>
                    </button>
                  )}
                </div>
                <div className="relative hidden min-h-0 min-w-0 overflow-hidden border-l border-white/6 [transform:translateZ(0)] lg:block">
                  {reportOpen && (
                    <button type="button" onClick={() => setReportOpen(false)} aria-label="Hide the report" className="absolute left-0 top-1/2 z-20 grid h-16 w-6 -translate-y-1/2 place-items-center rounded-r-xl border border-l-0 border-white/10 bg-surface text-text-2 hover:text-text-1">›</button>
                  )}
                  <div className="h-full w-[480px]">{report}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[520px] flex-col gap-6 px-4 py-6 lg:grid lg:max-w-[1440px] lg:grid-cols-[minmax(300px,420px)_1fr] lg:px-0 lg:py-0">
          <div className="hidden lg:block"><PersonaCard persona={persona} /></div>
          <div id="screen-note" className="flex flex-col gap-3" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[minmax(320px,420px)_1fr] lg:gap-10 lg:px-10 lg:py-10">
      <MobileBar persona={persona} />

      {/* Persona sheet */}
      <aside className="hidden flex-col gap-6 lg:sticky lg:top-10 lg:flex lg:max-h-[calc(100dvh-80px)] lg:self-start lg:overflow-y-auto">
        <div className="flex items-center justify-between gap-3">
          <RestartButton />
          <LangSwitch />
        </div>
        <PersonaCard persona={persona} />
        {persona === "manager" && <ManagerSwitches />}
        <OtherPersonas persona={persona} />
      </aside>

      {/* Phone, and the notes under it */}
      <main className="flex flex-col items-center gap-6 lg:items-start">
        <Phone>{children}{toaster}</Phone>
        <div id="screen-note" className="mx-auto flex w-full max-w-[520px] flex-col gap-3 px-4 pb-10 lg:max-w-[390px] lg:px-0" />
      </main>
    </div>
  );
}

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="w-full lg:flex lg:justify-center">
      <div
        data-phone
        data-look="noir"
        className="grain relative isolate mx-auto h-[calc(100dvh-44px)] w-full overflow-hidden bg-bg [container-type:inline-size] [transform:translateZ(0)] lg:h-[844px] lg:w-[390px] lg:rounded-[52px] lg:outline lg:outline-[10px] lg:outline-inset"
      >
        {children}
      </div>
    </div>
  );
}

function MobileBar({ persona }: { persona: PersonaId }) {
  const p = personaById(persona);
  return (
    <div className="flex items-center justify-between gap-3 px-4 pb-2 pt-[max(12px,env(safe-area-inset-top))] lg:hidden">
      <span className="truncate text-[13px] font-semibold">{p.name} · {p.role}</span>
      <div className="flex shrink-0 items-center gap-2">
        <RestartButton className="h-9 px-3" />
        <LangSwitch />
      </div>
    </div>
  );
}

function PersonaCard({ persona }: { persona: PersonaId }) {
  const p = personaById(persona);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className={cn("grid size-14 place-items-center rounded-2xl text-lg font-extrabold", persona === "manager" ? "bg-ai text-ai-ink" : "bg-surface")}>{p.initials}</div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{p.name}</h1>
          <p className="text-sm text-text-2">{p.role} · {p.when}</p>
        </div>
      </div>
      <p className="text-[19px] font-semibold leading-snug tracking-tight text-balance">“{p.quote}”</p>
      <div className="flex flex-col gap-2 rounded-[20px] bg-surface p-5">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-2">Needs</span>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-body">
          {p.needs.map((n) => <li key={n}>{n}</li>)}
        </ul>
        <span className="mt-2 text-[11px] font-bold uppercase tracking-[0.1em] text-text-2">Context</span>
        <p className="text-sm text-body">{p.context}</p>
      </div>
    </div>
  );
}

function Toggle({ label, options }: { label: string; options: { href: string; label: string; on: boolean }[] }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-2">{label}</span>
      <div className="inline-flex w-fit gap-0.5 rounded-full bg-surface p-1">
        {options.map((o) => (
          <Link key={o.href} href={o.href} className={cn("rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider", o.on ? "bg-text-1 text-ai-ink" : "text-text-2 hover:text-text-1")}>
            {o.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ManagerSwitches({ row = false }: { row?: boolean }) {
  const sp = useSearchParams();
  const path = usePathname();
  const solo = sp.get("night") === "solo";
  const phone = sp.get("device") === "phone";
  const href = (night: boolean, ph: boolean) => {
    const q = new URLSearchParams();
    if (night) q.set("night", "solo");
    if (ph) q.set("device", "phone");
    const s = q.toString();
    return s ? `${path}?${s}` : path;
  };
  return (
    <div className={cn("flex gap-6", row ? "items-end" : "flex-col")}>
      <div className="flex flex-col gap-2">
        <Toggle label="Night" options={[{ href: href(false, phone), label: "Team reported", on: !solo }, { href: href(true, phone), label: "No team reports", on: solo }]} />
        {!row && <p className="text-xs text-text-2">{solo ? "Nobody on the team reported anything. Sam is asked, or tells it herself." : "Mike and Ola reported 5 things during the night."}</p>}
      </div>
      <Toggle label="Device" options={[{ href: href(solo, false), label: "Laptop", on: !phone }, { href: href(solo, true), label: "Phone", on: phone }]} />
    </div>
  );
}

function OtherPersonas({ persona }: { persona: PersonaId }) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Other personas">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-2">Switch perspective</span>
      {shownPersonas.filter((x) => x.id !== persona).map((x) => (
        <Link key={x.id} href={x.href} className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm text-body hover:bg-surface hover:text-text-1">
          <span><b className="font-semibold text-text-1">{x.name}</b> · {x.view}</span>
          <span aria-hidden="true">›</span>
        </Link>
      ))}
    </nav>
  );
}

function TopStrip({ persona }: { persona: PersonaId }) {
  const p = personaById(persona);
  return (
    <div className="mx-auto flex w-full max-w-[1360px] flex-wrap items-end justify-between gap-6">
      <div className="flex items-center gap-5">
        <span className="text-[15px] font-semibold">{p.name} · <span className="text-text-2">{p.role}, at the office laptop · 03:02</span></span>
      </div>
      <div className="flex items-end gap-6">
        <ManagerSwitches row />
        <VoiceSwitch />
        <RestartButton />
        <details className="relative">
          <summary className="flex h-10 cursor-pointer list-none items-center rounded-full px-4 text-xs font-bold uppercase tracking-wider text-text-2 ring-1 ring-white/10 hover:text-text-1">Other personas</summary>
          <div className="absolute right-0 top-12 z-50 w-[320px] rounded-[20px] bg-surface p-3 shadow-2xl">
            <OtherPersonas persona={persona} />
          </div>
        </details>
        <LangSwitch />
      </div>
    </div>
  );
}

/** Notes for reviewers about the current screen, rendered under the device, never inside the product. */
export function Note({ title = "Behind this screen", children }: { title?: string; children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => setSlot(document.getElementById("screen-note")), []);
  if (!slot) return null;
  return createPortal(
    <section className="flex flex-col gap-2 rounded-[20px] border border-white/8 p-5 text-sm leading-relaxed text-body">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-2">{title}</span>
      {children}
    </section>,
    slot,
  );
}

/** Prototype control: the agent's voice on or off. */
function VoiceSwitch() {
  const v = useVoice();
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-2">Voice</span>
      <div className="inline-flex w-fit gap-0.5 rounded-full bg-surface p-1">
        <button type="button" onClick={() => setVoice({ sound: true })} aria-pressed={v.sound} className={cn("rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider", v.sound ? "bg-text-1 text-ai-ink" : "text-text-2 hover:text-text-1")}>Sound on</button>
        <button type="button" onClick={() => setVoice({ sound: false })} aria-pressed={!v.sound} className={cn("rounded-full px-4 py-2.5 text-xs font-bold uppercase tracking-wider", !v.sound ? "bg-text-1 text-ai-ink" : "text-text-2 hover:text-text-1")}>Sound off</button>
      </div>
    </div>
  );
}

/** Prototype control: reload this prototype from its first screen (keeps the night and the device). */
function RestartButton({ className }: { className?: string }) {
  const sp = useSearchParams();
  const path = usePathname();
  const restart = () => {
    const q = new URLSearchParams();
    for (const k of ["night", "device", "role"]) { const v = sp.get(k); if (v) q.set(k, v); }
    const s = q.toString();
    window.location.href = s ? `${path}?${s}` : path;
  };
  return (
    <button type="button" onClick={restart} className={cn("flex h-10 items-center gap-2 rounded-full px-4 text-xs font-bold uppercase tracking-wider text-text-1 ring-1 ring-white/15 hover:bg-white/5", className)}>
      <span aria-hidden="true">↺</span>Back to start
    </button>
  );
}
