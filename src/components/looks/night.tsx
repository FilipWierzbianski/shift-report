"use client";

import { Agent } from "@/components/agent/agent";
import { Pill } from "@/components/kit";

// Tonight at a glance (Studio noir): the agent, the night's numbers, one way in.
// Everything else (team reports, the draft) is in the report; the conversation starts here.

type Actions = { elapsed: string; onStart: () => void };

export function NoirNight({ elapsed, onStart }: Actions) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden px-6 pb-8 pt-6">
      <div className="rays" />
      <header className="relative flex items-center justify-between text-text-2" data-hide-web>
        <span className="grid size-10 place-items-center rounded-full border border-white/15 text-sm" aria-hidden="true">i</span>
        <span className="flex items-center gap-1.5 text-[15px] text-text-1">Copper Room · Sat <span className="text-text-2">⌄</span></span>
        <span className="size-10" aria-hidden="true" />
      </header>

      <div className="relative my-auto flex flex-col items-center gap-8">
        <div className="agent-band relative -mx-6 h-44 w-[calc(100%+3rem)] [mask-image:linear-gradient(90deg,transparent,#000_12%,#000_88%,transparent)]">
          <Agent variant="ribbons" state="idle" className="h-full w-full" label="Shift Report agent" />
        </div>

        <h1 className="max-w-[320px] text-balance text-center text-[30px] leading-tight">Tell me about tonight’s shift</h1>

        <div className="grid w-full max-w-[420px] grid-cols-4 divide-x divide-white/10 rounded-2xl bg-surface py-3 text-center">
          {[
            ["£14.8k", "revenue", false],
            ["612", "guests", false],
            ["14", "staff", false],
            ["−£45", "till 2", true],
          ].map(([v, l, flag]) => (
            <div key={l as string} className="flex flex-col gap-0.5">
              <span className="num flex items-center justify-center gap-1 text-[17px] tabular-nums">
                {flag && <span className="size-1.5 rounded-full bg-attention" aria-label="Needs a check" />}
                {v}
              </span>
              <span className="text-[11px] text-text-2">{l}</span>
            </div>
          ))}
        </div>
      </div>

      <Pill onClick={onStart} className="relative mx-auto w-full max-w-[420px]">Start the report</Pill>
    </div>
  );
}
