"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Agent } from "@/components/agent/agent";
import { cn } from "@/lib/utils";

// Sam's web app on the office laptop: a classic left menu (after the Superadt web layout).
// Tonight's report is the main item; the rest are where the report goes or came from.

const I = {
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  alert: <><path d="M12 3 2.5 20h19z" /><path d="M12 10v4M12 17h.01" /></>,
  team: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c.6-3.4 3-5 6-5s5.4 1.6 6 5" /><path d="M16 4.5a3 3 0 0 1 0 6M18 15c1.8.6 2.8 2.2 3 5" /></>,
  handover: <><path d="M4 8h13l-3-3M20 16H7l3 3" /></>,
  archive: <><rect x="3" y="4" width="18" height="5" rx="1.5" /><path d="M5 9v10h14V9M10 13h4" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4-4" /></>,
  chevron: <path d="m7 10 5 5 5-5" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
};

function Svg({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={cn("size-[18px] shrink-0", className)} aria-hidden="true">
      {children}
    </svg>
  );
}

type Item = { id: string; label: string; icon: ReactNode; badge?: number; attention?: boolean; onClick?: () => void; href?: string };

export function WebSidebar({
  active,
  incidents,
  reports,
  onTonight,
  onIncident,
}: {
  active: "tonight" | "incident";
  incidents: number;
  reports: number;
  onTonight: () => void;
  onIncident?: () => void;
}) {
  const items: Item[] = [
    { id: "tonight", label: "Tonight · Sat 31 Oct", icon: I.moon, onClick: onTonight },
    { id: "incident", label: "Incidents", icon: I.alert, badge: incidents, attention: incidents > 0, onClick: onIncident },
    { id: "team", label: "Team reports", icon: I.team, badge: reports, onClick: onTonight },
    { id: "handover", label: "Handovers", icon: I.handover, href: "/handover" },
  ];
  const week = [
    { day: "Fri 30 Oct", meta: "Filed 02:51" },
    { day: "Thu 29 Oct", meta: "Filed 01:58" },
    { day: "Wed 28 Oct", meta: "Filed by phone 03:24" },
    { day: "Sat 24 Oct", meta: "1 incident · filed 03:12" },
    { day: "Fri 23 Oct", meta: "Filed 02:47" },
  ];
  return (
    <aside className="flex min-h-0 flex-col gap-5 px-3 py-4">
      <div className="flex items-center gap-2.5 px-1">
        <span className="grid h-8 w-11 place-items-center overflow-hidden rounded-lg bg-inset">
          <Agent variant="ribbons" state="idle" className="h-7 w-11" label="Shift Report agent" />
        </span>
        <span className="text-[17px] font-semibold tracking-[-0.01em]" data-no-translate>Shift Report</span>
      </div>

      <button type="button" className="flex h-11 items-center justify-between rounded-xl bg-surface px-3 text-left text-[14px] hover:bg-surface-2">
        <span className="flex flex-col leading-tight">
          <span className="font-semibold">The Copper Room</span>
          <span className="text-[11px] text-text-2">Venue</span>
        </span>
        <Svg className="size-4 text-text-2">{I.chevron}</Svg>
      </button>

      <label className="flex h-10 items-center gap-2 rounded-xl bg-inset px-3 text-text-2">
        <Svg className="size-4">{I.search}</Svg>
        <input id="web-search" placeholder="Search reports…" aria-label="Search reports" className="min-w-0 flex-1 bg-transparent text-[14px] text-text-1 outline-none placeholder:text-text-2" />
      </label>

      <nav className="flex flex-col gap-0.5" aria-label="Main">
        {items.map((it) => {
          const on = it.id === active;
          const cls = cn(
            "flex h-10 items-center gap-3 rounded-xl px-3 text-[14px] transition-colors",
            on ? "bg-surface-2 font-semibold text-text-1" : "text-body hover:bg-surface hover:text-text-1",
          );
          const body = (
            <>
              <Svg className={on ? "text-text-1" : "text-text-2"}>{it.icon}</Svg>
              <span className="flex-1 truncate">{it.label}</span>
              {Boolean(it.badge) && (
                <span className={cn("rounded-md px-1.5 text-[11px] font-bold tabular-nums", it.attention ? "bg-attention/15 text-attention" : "bg-surface-2 text-text-2")}>{it.badge}</span>
              )}
            </>
          );
          return it.href ? (
            <Link key={it.id} href={it.href} className={cls}>{body}</Link>
          ) : (
            <button key={it.id} type="button" onClick={it.onClick} disabled={!it.onClick} aria-current={on ? "page" : undefined} className={cn(cls, "text-left disabled:opacity-50")}>
              {body}
            </button>
          );
        })}
      </nav>

      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <span className="flex items-center justify-between px-3 text-[12px] text-text-2">
          This week
          <Svg className="size-4">{I.archive}</Svg>
        </span>
        <div className="no-scrollbar flex min-h-0 flex-col gap-0.5 overflow-y-auto [mask-image:linear-gradient(#000_75%,transparent)]">
          {week.map((w) => (
            <div key={w.day} className="flex flex-col rounded-xl px-3 py-2">
              <span className="text-[13px] text-text-1">{w.day}</span>
              <span className="text-[11px] text-text-2">{w.meta}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5 rounded-2xl border border-white/8 bg-inset p-3.5">
        <span className="flex items-center gap-2 text-[13px] font-semibold">
          <Svg className="size-4 text-text-2">{I.phone}</Svg>Safety net on
        </span>
        <p className="text-[12px] leading-snug text-text-2">Not closed by 03:15? I’ll call your phone and ask the three things that matter.</p>
      </div>

      <div className="flex items-center gap-3 px-1">
        <span className="grid size-9 place-items-center rounded-xl bg-ai text-[12px] font-extrabold text-ai-ink">SR</span>
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-[14px] font-semibold">Sam Reyes</span>
          <span className="truncate text-[12px] text-text-2">Closing manager</span>
        </span>
      </div>
    </aside>
  );
}
