import { captures, people, stats, timeline } from "@/lib/night";
import { cn } from "@/lib/utils";
import { Icon, Label } from "@/components/kit";

export function StatGrid() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {stats.map((s) => (
        <div key={s.label} className="flex flex-col gap-0.5 rounded-[20px] bg-surface px-4 py-3">
          <Label className="flex items-center gap-1.5">
            {s.flag && <span className="size-[7px] rounded-full bg-attention" aria-hidden="true" />}
            {s.label} · {s.source}
          </Label>
          <span className="num text-[24px] font-extrabold leading-tight tracking-[-0.02em]">{s.value}</span>
          <span className={cn("text-xs", s.flag ? "text-attention" : "text-text-2")}>{s.note}</span>
        </div>
      ))}
    </div>
  );
}

export function NightBars({ highlight }: { highlight?: "anomaly" | "peak" | "incident" }) {
  const max = Math.max(...timeline.map((b) => b.n));
  return (
    <section className="flex flex-col gap-2" aria-label="People inside through the night, from the door counter. Peak 380 at 01:10.">
      <div className="flex items-baseline justify-between">
        <Label>People in · door counter</Label>
        <span className="text-xs text-text-2">peak 380</span>
      </div>
      <div className="flex h-14 items-end gap-[3px]" aria-hidden="true">
        {timeline.map((b) => {
          const h = Math.max(4, Math.round((b.n / max) * 56));
          const flagged = b.mark === "anomaly" || b.mark === "incident";
          const lit = highlight && b.mark === highlight;
          return (
            <span
              key={b.t}
              style={{ height: h }}
              className={cn(
                "flex-1 rounded-[3px]",
                b.mark === "peak" ? "bg-text-1" : "bg-bar-idle",
                flagged && "border-[1.5px] border-dashed border-attention bg-attention/25",
                lit && "bg-attention/30",
                highlight && !lit && "opacity-40",
              )}
            />
          );
        })}
      </div>
      <div className="relative h-4 text-[11px] text-text-2" aria-hidden="true">
        <span className="absolute left-0">20:00</span>
        {timeline.map((b, i) =>
          b.mark === "anomaly" || b.mark === "incident" ? (
            <span key={b.t} className="absolute -translate-x-1/2 whitespace-nowrap text-attention" style={{ left: `${((i + 0.5) / timeline.length) * 100}%` }}>
              {b.mark === "anomaly" ? "23:40 cancelled" : "01:40 fight"}
            </span>
          ) : null,
        )}
        <span className="absolute right-0">3am</span>
      </div>
    </section>
  );
}

const kindIcon = { photo: Icon.camera, voice: Icon.mic, note: Icon.note };

// Urgent first (fights, injuries) so it sits above the fold; each group reads in time order.
const ordered = [...captures].sort((a, b) => Number(Boolean(b.urgent)) - Number(Boolean(a.urgent)) || a.time.localeCompare(b.time));

export function TeamCaptures() {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <Label>From your team · {captures.length}</Label>
        <span className="text-xs text-text-2">sent during the shift</span>
      </div>
      <div className="overflow-hidden rounded-[20px] bg-surface">
        {ordered.map((c, i) => (
          <div key={c.id} className={cn("flex items-start gap-3 px-4 py-3", i < ordered.length - 1 && "border-b border-surface-2")}>
            <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-inset text-[12px] font-extrabold">
              {people[c.by].initials}
              {c.urgent && <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-surface bg-attention" aria-label="Flagged" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[13px]">
                <b className="font-semibold">{people[c.by].short}</b>
                <span className="text-text-2">{c.tag} · {c.time}</span>
                <span className="ml-auto text-text-2 [&_svg]:size-3.5">{kindIcon[c.kind]}</span>
              </div>
              <p className="mt-0.5 text-[13px] leading-snug text-body">{c.text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
