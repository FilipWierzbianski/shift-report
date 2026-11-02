"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// Plain <a> on purpose: a prefetching <Link> would hit the route handler and flip the language by itself.
export function LangSwitch({ className }: { className?: string }) {
  const lang = useLang();
  const path = usePathname();
  const qs = useSearchParams().toString();
  const next = encodeURIComponent(path + (qs ? `?${qs}` : ""));
  return (
    <div className={cn("inline-flex w-fit gap-0.5 rounded-full bg-surface p-1", className)} role="group" aria-label="Language">
      {(["en", "pl"] as const).map((l) => (
        <a
          key={l}
          href={`/${l}?next=${next}`}
          aria-current={l === lang ? "true" : undefined}
          className={cn("rounded-full px-3.5 py-2 text-xs font-bold uppercase tracking-wider", l === lang ? "bg-text-1 text-ai-ink" : "text-text-2 hover:text-text-1")}
        >
          {l}
        </a>
      ))}
    </div>
  );
}
