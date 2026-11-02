"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Agent, type AgentState } from "@/components/agent/agent";
import { Icon, IconButton, Label, Pill, SourceChip, SpeakText, useElapsed } from "@/components/kit";
import { Note, PersonaShell } from "@/components/persona-shell";
import { AttachSheet, sectionLabel, sectionShort, Thumb } from "@/components/attach";
import { FileChip, ReportPanel, ReportStub, type Attached } from "@/components/report";
import { WebSidebar } from "@/components/web-sidebar";
import {
  captures,
  categories,
  caughtFacts,
  coveredBy,
  demoStory,
  handover,
  incidentFields,
  incidentHistory,
  gapPriority,
  MAX_GAP_QUESTIONS,
  pickQuestions,
  promptOrder,
  questionCount,
  sectionPrompts,
  soloDataFacts,
  soloFacts,
  soloIncidentFields,
  soloQuestions,
  soloStory,
  venue,
  type Attachment,
  type Capture,
  type CategoryId,
  type Fact,
  type FactRow,
  type IncidentField,
  type RecallQuestion,
  type Scenario,
} from "@/lib/night";
import { resetSession, saveClosed } from "@/lib/session";
import { useT } from "@/lib/i18n";
import { canListen, listen, speak, useVoice } from "@/lib/voice";
import { NoirNight } from "@/components/looks/night";
import { cn } from "@/lib/utils";

type Screen = "lock" | "night" | "talk" | "sorting" | "caught" | "recall" | "incident" | "done" | "call";
type Path = "talk" | "guided";

// After Sam's story the agent leads: questions (incident first), then the final check in conversation.
const FLOW: Record<Path, Screen[]> = {
  talk: ["night", "talk", "sorting", "recall", "caught", "done"],
  guided: ["night", "recall", "caught", "done"],
};

const mmss = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

// Deep links (?screen=…) start the clock as if the manager had been going for a while,
// so screenshots and the Loom show realistic times.
const OFFSET: Partial<Record<Screen, number>> = { night: 18, talk: 40, sorting: 70, caught: 95, recall: 150, incident: 205, done: 252 };

// One night = everything that differs between "the team reported things" and "nobody did".
type NightData = {
  scenario: Scenario;
  reports: Capture[];
  story: string;
  storyFacts: Fact[];
  dataFacts: () => FactRow[];
  fields: IncidentField[];
  questions: (path: Path, incidentTonight: boolean) => RecallQuestion[];
};

const NIGHTS: Record<Scenario, NightData> = {
  team: {
    scenario: "team",
    reports: captures,
    story: demoStory,
    storyFacts: caughtFacts,
    dataFacts: () => factsFromData(),
    fields: incidentFields,
    questions: (path, incidentTonight) => pickQuestions({ path, incidentTonight }),
  },
  solo: {
    scenario: "solo",
    reports: [],
    story: soloStory,
    storyFacts: soloFacts,
    dataFacts: () => soloDataFacts.map((f) => ({ ...f, status: "pending" as const })),
    fields: soloIncidentFields,
    questions: (path) => soloQuestions(path),
  },
};

// Guided path without a story: facts come only from data + staff captures.
const factsFromData = (): FactRow[] =>
  caughtFacts.map((f) => ({
      ...f,
      status: "pending" as const,
      source: f.id === "f1" ? { who: "Mike's photo 01:42 + voice 02:04", quote: "Fight at bar end, glass broken, one guest cut" } : f.id === "f2" ? { who: "POS", quote: "Till 2 variance −£45 at cash-up" } : f.id === "f4" ? { who: "Rota", quote: "DJ clocked in 23:50, scheduled 23:00" } : f.source,
    }));

// Switching the night (team reported / nobody did) starts a fresh run, never a mix of both.
export function ManagerApp() {
  const sp = useSearchParams();
  return <ManagerFlow key={sp.get("night") === "solo" ? "solo" : "team"} />;
}

function ManagerFlow() {
  const sp = useSearchParams();
  const deep = (sp.get("screen") as Screen | null) ?? null;
  const deepPath: Path = sp.get("path") === "guided" ? "guided" : "talk";
  const night = NIGHTS[sp.get("night") === "solo" ? "solo" : "team"];
  const laptop = sp.get("device") !== "phone";
  const t = useT();

  const [screen, setScreen] = useState<Screen>(deep ?? "lock");
  const [path, setPath] = useState<Path>(deepPath);
  const [startedAt, setStartedAt] = useState(() => Date.now() - (deep ? (OFFSET[deep] ?? 0) : 0) * 1000);
  const [story, setStory] = useState(deep && deep !== "night" && deep !== "lock" ? night.story : "");
  const [facts, setFacts] = useState<FactRow[]>(() =>
    deep && ["caught", "recall", "incident", "done"].includes(deep)
      ? (deepPath === "guided" ? night.dataFacts() : night.storyFacts.map((f) => ({ ...f, status: "pending" as const })))
      : [],
  );
  const [aiSource, setAiSource] = useState<"demo" | "claude">("demo");
  const [gaps, setGaps] = useState<Record<string, string>>((): Record<string, string> =>
    deep === "done" ? { other: "Ejected, not identified", injury: "Small cut, right hand", ambulance: "Offered, refused", cctv: "Not known" } : {},
  );
  const [incidentFrom, setIncidentFrom] = useState<"caught" | "flow">("flow");
  // Who hears about tonight (decided at the end, in the conversation).
  const [notify, setNotify] = useState({ tom: true, dana: true });
  // Evidence and Sam's own lines, by report section.
  const [attached, setAttached] = useState<Attached[]>([]);
  const [notes, setNotes] = useState<FactRow[]>([]);
  // What the voice has heard so far, so the report panel lights sections up live.
  const [heard, setHeard] = useState("");
  // What the agent last said in the conversation: its opening line, or a hint Sam picked.
  const [line, setLine] = useState("Tell me about the shift.");
  const ask = (q: string) => { setLine(q); if (screen !== "talk") { setPath("talk"); go("talk"); } };
  // On the laptop there is no lock screen: the web app opens on tonight.
  useEffect(() => {
    // Runs once after mount: only the browser knows the screen width (the server renders the phone's lock screen).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!deep && laptop && window.matchMedia("(min-width: 1024px)").matches) { resetSession(); setScreen("night"); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const incidentConfirmed = facts.some((f) => f.incident && f.status === "confirmed");
  const gapsLeft = night.fields.filter((f) => f.value === null && !gaps[f.id]).length;
  const hasIncident = facts.some((f) => f.incident && f.status !== "rejected");

  const elapsed = useElapsed(startedAt);
  // A toast belongs to the screen that raised it; never let it cover the next one.
  useEffect(() => {
    const id = setTimeout(() => toast.dismiss(), 0);
    return () => clearTimeout(id);
  }, [screen]);
  const go = (s: Screen) => setScreen(s);
  const next = () => {
    const seq = FLOW[path];
    let i = seq.indexOf(screen) + 1;
    // The incident may already be done as a detour from "caught"; don't ask twice.
    // A quiet night with no incident skips the insurer step altogether.
    if (seq[i] === "incident" && (incidentConfirmed || !hasIncident)) i += 1;
    setScreen(seq[Math.min(seq.length - 1, i)]);
  };
  const start = () => {
    resetSession();
    setStartedAt(Date.now());
    go("night");
  };
  const attach = (to: CategoryId | "report", items: Attachment[], note?: string) => {
    setAttached((xs) => [...xs.filter((x) => !items.some((a) => a.id === x.a.id)), ...items.map((a) => ({ a, to: to === "report" ? a.category : to }))]);
    if (note && to !== "report") {
      setNotes((xs) => [...xs, { id: `n-${xs.length}`, category: to, title: note, detail: "Your note", status: "confirmed", fromAnswer: true, source: { who: "You", quote: note } }]);
    }
    const n = items.length + (note ? 1 : 0);
    toast(n === 1 ? t("Added to {0}", sectionLabel(to === "report" ? (items[0]?.category ?? "general") : to)) : t("{0} items added to the report", n));
  };

  const openIncident = () => { setIncidentFrom("caught"); if (!facts.length) setFacts(night.dataFacts()); go("incident"); };
  // The report as it stands: the systems' draft until Sam's story is sorted, then her facts.
  const reportItems = [...(facts.length ? facts : night.dataFacts()), ...notes];
  const sentAt = (() => {
    const [m] = elapsed.split(":").map(Number);
    return `03:${String(2 + m).padStart(2, "0")}`;
  })();
  const solo = night.scenario === "solo";
  const report = (
    <ReportPanel
      items={reportItems}
      attached={attached}
      hearing={screen === "talk" ? coveredBy(heard) : new Set()}
      incident={reportItems.some((f) => f.incident && f.status !== "rejected") ? { fields: night.fields, gaps, confirmed: incidentConfirmed } : null}
      sent={screen === "done" ? sentAt : null}
      onOpenIncident={screen === "lock" || screen === "call" || screen === "done" ? undefined : () => openIncident()}
      onAdd={attach}
      onAsk={screen === "night" || screen === "talk" ? ask : undefined}
    />
  );

  const incidentCount = reportItems.filter((f) => f.incident && f.status !== "rejected").length;
  const sidebar = (
    <WebSidebar
      active={screen === "incident" ? "incident" : "tonight"}
      incidents={incidentCount}
      reports={night.reports.length}
      onTonight={() => go(screen === "lock" || screen === "call" ? "lock" : facts.length ? "caught" : "night")}
      onIncident={incidentCount && screen !== "lock" && screen !== "call" ? openIncident : undefined}
    />
  );
  const webTop = (
    <div className="flex h-14 items-center justify-between gap-4 border-b border-white/6 px-5">
      <span className="flex items-center gap-2 text-[14px] text-text-2">
        The Copper Room <span aria-hidden="true">/</span> <span className="text-text-1">Tonight</span>
      </span>
      <div className="flex items-center gap-2">
        <span className={cn("rounded-full px-3 py-1.5 text-[12px] font-bold", screen === "done" ? "bg-text-1 text-ai-ink" : "bg-surface text-body")}>
          {screen === "done" ? t("Sent {0}", sentAt) : solo ? t("Draft · {0}", "40%") : t("Draft · {0}", facts.length ? "90%" : "70%")}
        </span>
      </div>
    </div>
  );

  const shell = (node: React.ReactNode, note?: React.ReactNode) => (
    <PersonaShell persona="manager" report={report} reportBadge={`${categories.filter((c) => reportItems.some((f) => f.category === c.id && f.status !== "rejected") || attached.some((x) => x.to === c.id)).length}/${categories.length}`} sidebar={sidebar} webTop={webTop}>
      <div key={screen} className="screen-in absolute inset-0 flex flex-col overflow-hidden">{node}</div>
      {note && <Note>{note}</Note>}
    </PersonaShell>
  );

  switch (screen) {
    case "lock":
      return shell(
        <LockScreen night={night} onStart={start} />,
        <>
          <p>
            {solo
              ? "03:02, two minutes after the doors close. The agent has already pulled the till, the door counter and the rota. Nobody on the team sent anything tonight, so the draft is only 40% and the agent will ask more."
              : "03:02, two minutes after the doors close. The agent has already pulled the till, the door counter and the rota, plus what Mike and Ola sent during the night, so Sam never starts from an empty form."}
          </p>
          <p>The notification reaches her phone; she can finish on the office laptop or on the phone. The draft is the same.</p>
          <button
            type="button"
            // The call rings Sam's phone, so on the laptop the shortcut switches to the phone view.
            onClick={() => (laptop && window.matchMedia("(min-width: 1024px)").matches ? (window.location.href = `/manager?${solo ? "night=solo&" : ""}device=phone&screen=call`) : go("call"))}
            className="mt-1 w-fit rounded-full px-4 py-2 text-[13px] font-semibold text-text-1 ring-1 ring-white/15 hover:bg-white/5">
            Prototype shortcut: skip to 03:15, the agent calls →
          </button>
        </>,
      );
    case "night":
      return shell(
        <NoirNight elapsed={elapsed} onStart={() => { setPath("talk"); setLine("Tell me about the shift."); go("talk"); }} />,
        <>
          <p>Numbers come from integrations: revenue and till 2 from the till system (POS), guests from the door counter, staff from the rota. Sam typed none of it.</p>
          <p>One way in: she just starts talking. Structure is there but quiet: greyed example questions under the conversation, and a helper question for every section in the report on the right. Nobody has to choose “guided” or “free” up front.</p>
          <button
            type="button"
            onClick={() => (laptop && window.matchMedia("(min-width: 1024px)").matches ? (window.location.href = `/manager?${solo ? "night=solo&" : ""}device=phone&screen=call`) : go("call"))}
            className="mt-1 w-fit rounded-full px-4 py-2 text-[13px] font-semibold text-text-1 ring-1 ring-white/15 hover:bg-white/5"
          >
            Prototype shortcut: skip to 03:15, the agent calls →
          </button>
        </>,
      );
    case "talk":
      return shell(
        <TalkScreen
          story={night.story}
          elapsed={elapsed}
          attached={attached}
          line={line}
          onAsk={ask}
          onHeard={setHeard}
          onAttach={(xs) => attach("report", xs)}
          onRemove={(id) => setAttached((xs) => xs.filter((x) => x.a.id !== id))}
          onCancel={() => go("night")}
          onDone={(text) => { setStory(text); setHeard(""); go("sorting"); }}
        />,
        <>
          <p>The agent opens with one line, then listens. Talking is the default; the keyboard is there for the laptop. In the prototype Sam’s words are scripted; type your own night and, with an API key, a real Claude call sorts it.</p>
          <p>The greyed questions at the bottom are for a manager who doesn’t know where to start; they change as sections get covered. A talker just ignores them. Nothing is required: every section of the report is optional.</p>
          <p>The camera button opens only what was taken during the shift (18:00–03:00): photos, videos and files. The AI reads each one and files it under a section. Real file handling is out of scope, so the camera roll is a fixed set of generated photos.</p>
        </>,
      );
    case "sorting":
      return shell(
        <SortingScreen
          night={night}
          story={story}
          onDone={(rows, src) => { setFacts(rows); setAiSource(src); go("recall"); }}
        />,
        <p>With ANTHROPIC_API_KEY set, this is a real Claude call (one schema, every fact must quote its source). Without a key, or if the call fails, it falls back to a scripted answer for this night, so the prototype never dies on bad wifi.</p>,
      );
    case "caught":
      return shell(
        <CaughtScreen
          elapsed={elapsed}
          facts={facts}
          notify={notify}
          setNotify={setNotify}
          attached={attached}
          laptop={laptop}
          aiSource={aiSource}
          setFacts={setFacts}
          gapsLeft={gapsLeft}
          incidentConfirmed={incidentConfirmed}
          onAdd={attach}
          onIncident={() => { setIncidentFrom("caught"); go("incident"); }}
          onNext={next}
        />,
        <>
          <p>The last part of the conversation. The agent has the whole report; Sam decides whether it’s right and who hears about it. Saying “Yes, I accept everything” closes it in one go.</p>
          <p>Every line shows where it came from (who, and the exact words), so Sam checks instead of rewriting.</p>
          <p>“Next shift” is the AI’s suggested fix. Tap it to pick another one, say or type her own, or drop it. Her choice is what Tom gets in the morning.</p>
          <p>Sections nothing was said about stay visible as empty and optional: the report accepts whatever she has.</p>
        </>,
      );
    case "recall":
      return shell(
        <RecallScreen
          night={night}
          elapsed={elapsed}
          path={path}
          facts={facts}
          gaps={gaps}
          setGaps={setGaps}
          onAdd={(f) => setFacts((xs) => [...xs, f])}
          onUndo={(id) => setFacts((xs) => xs.filter((x) => x.id !== id))}
          onBack={() => go(path === "talk" ? "caught" : "night")}
          onNext={next}
        />,
      );
    case "incident":
      return shell(
        <IncidentScreen
          night={night}
          elapsed={elapsed}
          gaps={gaps}
          setGaps={setGaps}
          evidence={attached.filter((x) => x.to === "incidents").map((x) => x.a)}
          onBack={() => go("caught")}
          onConfirm={() => {
            setFacts((xs) => xs.map((x) => (x.incident ? { ...x, status: "confirmed" } : x)));
            setIncidentFrom("flow");
            go("caught");
          }}
        />,
        <>
          <p>The fields follow a typical UK licensed-premises incident form. Time, place, type and description are the minimum for every incident; the rest is what an insurer asks next.</p>
          <p>Gaps are never guessed. “Don’t know” is a valid answer and is logged as such, so the record holds up without Sam being perfect. In the prototype, “Say it” plays a scripted answer.</p>
        </>,
      );
    case "done":
      return shell(
        <DoneScreen night={night} startedAt={startedAt} facts={[...facts, ...notes]} gaps={gaps} attached={attached} notify={notify} onAddNote={(text) => attach([...coveredBy(text)][0] ?? "general", [], text)} />,
        <>
          <p>Sam doesn’t open these. Dana’s morning view is under “Other personas”.</p>
          <p>Owners and insurers read the report but aren’t users of this flow. Their views only show where the report goes and that it holds up.</p>
        </>,
      );
    case "call":
      return shell(<CallScreen onEnd={() => go("lock")} />, <p>Safety net: if the report isn’t closed by 03:15, the agent calls Sam and asks the three things that matter. The conversation is scripted in the prototype.</p>);
  }
}

// ---------------------------------------------------------------------------

function AgentSlot({ state, size }: { state: AgentState; size: "mini" | "mid" | "hero" }) {
  if (size === "mini") return <Agent variant="ribbons" state={state} className="h-7 w-14 shrink-0 rounded-lg" label="Shift Report agent" />;
  return (
    <div className={cn("agent-band relative w-[100cqw] max-w-[390px] shrink-0 self-center [mask-image:linear-gradient(90deg,transparent,#000_14%,#000_86%,transparent)]", size === "mid" ? "h-28" : "h-56")}>
      <Agent variant="ribbons" state={state} className="h-full w-full" label="Shift Report agent" />
    </div>
  );
}

function TopBar({ left, title, right }: { left?: React.ReactNode; title?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between gap-3 px-5 pb-2 pt-6">
      <div className="flex min-w-11 items-center gap-2.5">{left}</div>
      <div className="min-w-0 flex-1 text-center">{title}</div>
      <div className="flex min-w-11 justify-end">{right}</div>
    </header>
  );
}

// ---------------------------------------------------------------------------
// 0 · Lock screen notification at 03:02

function LockScreen({ night, onStart }: { night: NightData; onStart: () => void }) {
  return (
    <div className="relative flex h-full flex-col overflow-hidden px-5 pb-8 pt-16">
      <div className="rays" />
      <div className="relative flex flex-col items-center gap-1" data-hide-web>
        <span className="text-sm font-semibold text-body">Sunday 1 November</span>
        <span className="text-[84px] font-semibold leading-none tracking-[-0.04em]">3:02</span>
      </div>
      {/* On the laptop there is no lock screen: the app opens on tonight's draft. */}
      <div className="relative -mx-5 flex-col items-center" data-show-web>
        <AgentSlot state="idle" size="hero" />
      </div>
      <div className="relative mt-auto flex flex-col gap-3">
        <div className="glass sheet-in flex flex-col gap-3 rounded-[26px] p-4">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center overflow-hidden rounded-[10px] bg-inset">
              <AgentSlot state="idle" size="mini" />
            </div>
            <span className="text-[13px] font-bold" data-no-translate>Shift Report</span>
            <span className="ml-auto text-xs text-text-2">now</span>
          </div>
          <p className="text-[15px] font-semibold leading-snug">{night.reports.length ? "Doors closed. Tonight is 70% drafted." : "Doors closed. Tonight is 40% drafted."}</p>
          <p className="text-sm leading-snug text-body">
            {night.reports.length
              ? `I pulled POS, door and rota. Mike and Ola sent ${night.reports.length} reports, ${night.reports.filter((c) => c.urgent).length} about a fight at 01:40. About 4 minutes.`
              : "I pulled POS, door and rota. Nobody on the team sent anything tonight, so I’ll need you for the rest. About 5 minutes."}
          </p>
          <Pill onClick={onStart} className="mt-1 w-full">Open the draft</Pill>
          <p className="text-center text-xs text-text-2">Not now? If it isn’t done by 03:15, I’ll call you.</p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2 · Tell me (brain-dump). The voice streams the story; sections light up live.
// Photos, videos and files from tonight can be added at any point.

function TalkScreen({
  story: storyEn, elapsed, attached, line, onAsk, onHeard, onAttach, onRemove, onCancel, onDone,
}: {
  story: string; elapsed: string; attached: Attached[]; line: string; onAsk: (q: string) => void;
  onHeard: (text: string) => void; onAttach: (items: Attachment[]) => void; onRemove: (id: string) => void;
  onCancel: () => void; onDone: (text: string) => void;
}) {
  const t = useT();
  const story = t(storyEn);
  const words = useMemo(() => story.split(" "), [story]);
  const [n, setN] = useState(0);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [picking, setPicking] = useState(false);
  const [reading, setReading] = useState<string[]>([]);
  // The agent speaks first; Sam's answer starts once it has finished its line (on screen and out loud).
  const [wordsDone, setWordsDone] = useState(false);
  const [voiceDone, setVoiceDone] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!wordsDone || !voiceDone || ready) return;
    const id = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(id);
  }, [wordsDone, voiceDone, ready]);
  // Live mic: the browser transcribes what Sam says. Scripted: her story for this night plays.
  const live = useVoice().mic === "live" && canListen();
  const [spoken, setSpoken] = useState("");
  const [micOn, setMicOn] = useState(false);
  const listening = ready && !typing && (live ? micOn : n < words.length);

  useEffect(() => {
    if (typing || !ready || live) return;
    const id = setInterval(() => setN((x) => Math.min(words.length, x + 1)), 120);
    return () => clearInterval(id);
  }, [typing, ready, live, words.length]);
  useEffect(() => {
    if (typing || !ready || !live) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the mic is an external system; its state mirrors it
    setMicOn(true);
    const stop = listen({ continuous: true, onText: (x) => setSpoken(x), onEnd: () => setMicOn(false) });
    return () => stop?.();
  }, [typing, ready, live]);

  const text = typing ? typed : live ? spoken : words.slice(0, n).join(" ");
  const covered = coveredBy(text);
  useEffect(() => onHeard(text), [text]); // eslint-disable-line react-hooks/exhaustive-deps
  const tail = 4;
  const lit = categories.filter((c) => covered.has(c.id) || attached.some((x) => x.to === c.id));
  const rest = categories.length - lit.length - (lit.some((c) => c.id === "incidents") ? 0 : 1);
  // Greyed hints for someone who doesn't know what to say next: the first sections not covered yet.
  const hints = promptOrder.filter((c) => !lit.some((x) => x.id === c)).slice(0, 3).map((c) => sectionPrompts[c]);

  const add = (xs: Attachment[]) => {
    onAttach(xs);
    // The AI "reads" each one for a moment before filing it.
    setReading((r) => [...r, ...xs.map((a) => a.id)]);
    setTimeout(() => setReading((r) => r.filter((id) => !xs.some((a) => a.id === id))), 1400);
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="rays" />
      <TopBar
        left={<IconButton onClick={onCancel} aria-label="Back to the draft">{Icon.back}</IconButton>}
        title={<span className="text-[13px] font-semibold text-body">{typing ? "Typing" : !ready ? "Agent" : listening ? "Listening…" : "Got all of that"}</span>}
      />
      <div className="relative flex flex-col items-center gap-2 px-6">
        <AgentSlot state={!ready ? "speaking" : listening ? "listening" : "idle"} size="mid" />
        <SpeakText key={line} text={line} onDone={() => setWordsDone(true)} onSpoken={() => setVoiceDone(true)} className={cn("text-center font-semibold tracking-[-0.01em] transition-[font-size,color] duration-500", n > 0 || typing ? "text-[15px] text-text-2" : "text-[26px] text-text-1")} />
      </div>
      <div className="no-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden px-6 pt-3">
        {typing ? (
          <textarea
            id="story"
            autoFocus
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Type it like a text to a mate. Times are optional."
            className="h-48 w-full resize-none rounded-[20px] bg-surface p-4 text-[16px] leading-relaxed text-text-1 outline-none placeholder:text-text-2"
            aria-label="Tell me about the night"
          />
        ) : (
          <p className="text-center text-[21px] font-medium leading-[1.45] tracking-[-0.01em]" data-no-translate>
            {live && spoken}
            {!live && words.slice(0, n).map((w, i) => (
              <span key={i} className={cn("transition-[filter,opacity] duration-500", i >= n - tail && listening ? "opacity-60 blur-[2px]" : "")}>
                {w}{" "}
              </span>
            ))}
          </p>
        )}
      </div>
      <div className="relative flex flex-col gap-3 px-5 pb-6 pt-3">
        {attached.length > 0 && (
          <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5" aria-label="Attached">
            {attached.map(({ a, to }) => (
              <div key={a.id} className="flex shrink-0 items-center gap-2 rounded-2xl bg-surface p-1.5 pr-1">
                <Thumb a={a} className="size-11 shrink-0" />
                <div className="flex w-[124px] flex-col">
                  {reading.includes(a.id) ? (
                    <span className="gap-pulse text-[12px] font-semibold text-ai">Reading…</span>
                  ) : (
                    <>
                      <span className="truncate text-[12px] font-semibold">{a.kind === "document" ? <span data-no-translate>{a.name}</span> : a.reading}</span>
                      <span className="truncate text-[11px] text-ai">→ {sectionShort(to as CategoryId)}</span>
                    </>
                  )}
                </div>
                <button type="button" onClick={() => onRemove(a.id)} aria-label={t("Remove {0}", a.reading)} className="grid size-9 shrink-0 place-items-center rounded-xl text-text-2 hover:text-text-1 [&_svg]:size-4">{Icon.close}</button>
              </div>
            ))}
          </div>
        )}
        {hints.length > 0 && (
          <div className="flex flex-col items-center gap-0.5" aria-label="Ideas if you’re stuck">
            {hints.map((h) => (
              <button key={h} type="button" onClick={() => onAsk(h)} className="min-h-8 px-2 text-[13px] text-text-3 transition-colors hover:text-text-2">
                {h}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-1.5" aria-label="What I've heard about so far" data-hide-web>
          {lit.map((c) => (
            <span key={c.id} className="inline-flex h-8 items-center gap-1 rounded-xl bg-ai/12 px-2.5 text-[11px] font-bold uppercase tracking-[0.04em] text-ai">
              <span className="size-3">{Icon.check}</span>
              {c.short}
            </span>
          ))}
          {!lit.some((c) => c.id === "incidents") && (
            <span className="inline-flex h-8 items-center rounded-xl border-[1.5px] border-dashed border-line-dashed px-2.5 text-[11px] font-bold uppercase tracking-[0.04em] text-text-2">Incidents</span>
          )}
          <span className="inline-flex h-8 items-center px-1 text-[11px] font-semibold text-text-2">{t("+{0} more sections, all optional", rest)}</span>
        </div>
        <div className="glass mx-auto flex items-center gap-1 rounded-2xl p-1.5">
          <button type="button" onClick={onCancel} aria-label="Cancel" className="grid size-14 place-items-center rounded-xl text-body hover:bg-white/5 [&_svg]:size-5">{Icon.close}</button>
          <button
            type="button"
            onClick={() => setPicking(true)}
            aria-label="Add photos, videos or files"
            className="grid size-14 place-items-center rounded-xl text-body hover:bg-white/5 [&_svg]:size-5"
          >
            {Icon.camera}
          </button>
          <button
            type="button"
            onClick={() => onDone(text || (live ? "" : story) || story)}
            disabled={typing && typed.trim().length < 3}
            aria-label="Done talking"
            className="grid h-14 w-24 place-items-center rounded-xl bg-text-1 text-ai-ink disabled:opacity-40"
          >
            <span className="flex items-center gap-1.5 text-[13px] font-bold [&_svg]:size-5">{Icon.check}{t("Done")}</span>
          </button>
          <button
            type="button"
            onClick={() => { setTyping((x) => !x); setTyped(text); }}
            aria-label={typing ? "Switch to voice" : "Type instead"}
            className={cn("grid size-14 place-items-center rounded-xl hover:bg-white/5 [&_svg]:size-5", typing ? "text-text-1" : "text-body")}
          >
            {typing ? Icon.mic : Icon.keyboard}
          </button>
        </div>
      </div>
      {picking && <AttachSheet onClose={() => setPicking(false)} onAdd={(xs) => add(xs)} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2b · Sorting: the real Claude call (or the scripted night).

function SortingScreen({ night, story, onDone }: { night: NightData; story: string; onDone: (rows: FactRow[], src: "demo" | "claude") => void }) {
  const done = useRef(false);
  // Move on only when both are true: the facts are back, and the agent has finished saying its line.
  const [result, setResult] = useState<{ rows: FactRow[]; src: "demo" | "claude" } | null>(null);
  const [spoken, setSpoken] = useState(false);
  useEffect(() => {
    const t0 = Date.now();
    fetch("/api/extract", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ story, scenario: night.scenario }) })
      .then((r) => r.json())
      .then((data: { source: "demo" | "claude"; facts: { category: CategoryId; title: string; detail: string; quote: string; who: string; incident: boolean; carryOver: string | null }[] }) => {
        // Facts keep the other fixes from the night data when the titles match.
        const rows: FactRow[] = data.facts.map((f, i) => ({
          id: `x${i}`,
          category: f.category,
          title: f.title,
          detail: f.detail,
          incident: f.incident,
          carryOver: f.carryOver ?? undefined,
          alternatives: night.storyFacts.find((k) => k.title === f.title)?.alternatives,
          source: { who: f.who, quote: f.quote },
          status: "pending",
        }));
        setTimeout(() => setResult({ rows, src: data.source }), Math.max(0, 1600 - (Date.now() - t0)));
      })
      .catch(() => setResult({ rows: night.storyFacts.map((f) => ({ ...f, status: "pending" })), src: "demo" }));
    // Never hang on a voice that doesn't finish (blocked audio, slow network).
    const safety = setTimeout(() => setSpoken(true), 9000);
    return () => clearTimeout(safety);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!result || !spoken || done.current) return;
    done.current = true;
    const id = setTimeout(() => onDone(result.rows, result.src), 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, spoken]);
  return (
    <div className="relative flex h-full flex-col items-center justify-center gap-6 overflow-hidden px-8">
      <div className="rays" />
      <AgentSlot state="thinking" size="hero" />
      <div className="relative flex flex-col items-center gap-2 text-center">
        <SpeakText text="Sorting your night into the report…" onSpoken={() => setSpoken(true)} className="text-[22px] font-semibold tracking-[-0.01em]" />
        <p className="text-sm text-text-2">Matching what you said with POS, door, rota and your team’s reports.</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5 · Decide: the last part of the conversation. The agent has the whole report; Sam checks it,
// picks the fixes, says whether the team hears about it, or just says "yes, I accept everything".

type Notify = { tom: boolean; dana: boolean };

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={cn("relative h-7 w-12 shrink-0 rounded-full transition-colors", on ? "bg-text-1" : "bg-surface-2")}>
      <span className={cn("absolute top-1 size-5 rounded-full transition-[left]", on ? "left-6 bg-ai-ink" : "left-1 bg-text-2")} />
    </button>
  );
}

const ACCEPT = /(^|\b)(yes|yeah|accept|ok|okay|tak|akceptuj|zgadza)/i;

function CaughtScreen({
  elapsed, facts, attached, laptop, aiSource, setFacts, gapsLeft, incidentConfirmed, notify, setNotify, onAdd, onIncident, onNext,
}: {
  elapsed: string; facts: FactRow[]; attached: Attached[]; laptop: boolean; aiSource: "demo" | "claude";
  setFacts: React.Dispatch<React.SetStateAction<FactRow[]>>; gapsLeft: number; incidentConfirmed: boolean;
  notify: Notify; setNotify: (n: Notify) => void;
  onAdd: (to: CategoryId, items: Attachment[], note?: string) => void; onIncident: () => void; onNext: () => void;
}) {
  const t = useT();
  const incidents = facts.filter((f) => f.incident);
  const routine = facts.filter((f) => !f.incident);
  const pending = routine.filter((f) => f.status === "pending");
  const evidence = attached.filter((x) => x.to === "incidents").map((x) => x.a);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [fixing, setFixing] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(true);
  const [mode, setMode] = useState<"idle" | "voice" | "type">("idle");
  const [typed, setTyped] = useState("");
  const saveEdit = (id: string) => {
    setFacts((xs) => xs.map((x) => (x.id === id ? { ...x, title: draft.trim() || x.title, status: "confirmed", edited: true, was: x.was ?? t(x.title) } : x)));
    setEditing(null);
  };
  const setFix = (id: string, fix: string | null) => {
    setFacts((xs) => xs.map((x) => (x.id === id ? { ...x, carryWas: x.carryWas ?? x.carryOver, carryOver: fix ?? undefined, status: "confirmed" } : x)));
    setFixing(null);
  };

  const set = (id: string, status: FactRow["status"]) => setFacts((xs) => xs.map((x) => (x.id === id ? { ...x, status } : x)));
  const reject = (f: FactRow) => {
    set(f.id, "rejected");
    toast(t("Removed “{0}”", f.title), { action: { label: t("Undo"), onClick: () => set(f.id, "pending") } });
  };
  // "Yes, I accept everything": every open line and the incident are confirmed, the report closes.
  const acceptAll = () => {
    setFacts((xs) => xs.map((x) => (x.status === "pending" ? { ...x, status: "confirmed" } : x)));
    onNext();
  };
  const live = useVoice().mic === "live" && canListen();
  const [liveText, setLiveText] = useState("");
  const sayYes = () => {
    setMode("voice");
    if (!live) { setTimeout(acceptAll, 2400); return; }
    let last = "";
    setLiveText("");
    listen({
      continuous: false,
      onText: (x) => { last = x; setLiveText(x); },
      onEnd: () => {
        const v = last.trim();
        if (v && ACCEPT.test(v)) return acceptAll();
        if (v) onAdd("general", [], v);
        setMode("idle");
      },
    });
  };
  const submitTyped = () => {
    const v = typed.trim();
    if (!v) return;
    if (ACCEPT.test(v)) return acceptAll();
    onAdd("general", [], v);
    setTyped("");
    setMode("idle");
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="rays" />
      <TopBar
        left={<><AgentSlot state={speaking ? "speaking" : "idle"} size="mini" /><span className="text-[13px] font-semibold text-body">{aiSource === "claude" ? t("Final check · Claude") : t("Final check")}</span></>}
      />
      <div className="relative flex flex-col items-center gap-1 px-5 pb-2 text-center">
        <AgentSlot state={speaking ? "speaking" : "idle"} size="mid" />
        <SpeakText
          text="We have the whole report. Decide if it’s right and whether we tell the team."
          onDone={() => setSpeaking(false)}
          className="text-[22px] font-semibold leading-[1.3] tracking-[-0.02em] text-balance"
        />
      </div>
      <div className="no-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden px-5 pb-4">
        <div className="flex flex-col gap-4 pt-2">

          {incidents.map((f) => (
            <div key={f.id} className={cn("flex flex-col gap-3 rounded-[20px] bg-surface p-4", gapsLeft && !incidentConfirmed ? "border-[1.5px] border-dashed border-attention/70" : "")}>
              <div className="flex items-center justify-between">
                <Label className={gapsLeft && !incidentConfirmed ? "text-attention" : ""}>Incident · for the insurer</Label>
                {incidentConfirmed ? (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-text-1 px-2 py-0.5 text-[11px] font-bold text-ai-ink"><span className="size-3">{Icon.check}</span>{t("Confirmed")}</span>
                ) : gapsLeft ? (
                  <span className="rounded-lg bg-attention/15 px-2 py-0.5 text-[11px] font-bold text-attention">{t("{0} details open", gapsLeft)}</span>
                ) : (
                  <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[11px] font-bold">{t("Complete")}</span>
                )}
              </div>
              <div>
                <p className="text-[17px] font-bold leading-snug">{f.title}</p>
                <p className="text-[13px] text-text-2">{f.detail}</p>
              </div>
              <div className="flex flex-col gap-1">
                <SourceChip className="w-fit">{f.source.who}</SourceChip>
                <p className="text-[13px] italic text-body">“{f.source.quote}”</p>
              </div>
              {evidence.length > 0 && <div className="flex flex-wrap gap-2">{evidence.map((a) => <FileChip key={a.id} a={a} />)}</div>}
              <Pill variant={gapsLeft && !incidentConfirmed ? "attention" : "secondary"} size="md" onClick={onIncident}>{t("Review the record")}</Pill>
            </div>
          ))}

          <div className="flex items-center justify-between">
            <Label>{t("The rest · {0}", routine.length)}</Label>
            {pending.length > 0 && <span className="text-[12px] text-text-2">{t("{0} to check", pending.length)}</span>}
          </div>
          <div className="overflow-hidden rounded-[20px] bg-surface">
            {routine.map((f, i) => {
              const files = attached.filter((x) => x.to === f.category).map((x) => x.a);
              return (
                <div key={f.id} className={cn("flex gap-3 px-4 py-3.5", i < routine.length - 1 && "border-b border-surface-2", f.status === "rejected" && "opacity-45")}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Label className="text-[10px]">{sectionShort(f.category)}</Label>
                      {f.fromAnswer && <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-2">from your answer</span>}
                    </div>
                    {editing === f.id ? (
                      <form className="mt-1 flex gap-2" onSubmit={(e) => { e.preventDefault(); saveEdit(f.id); }}>
                        <input id={`edit-${f.id}`} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} aria-label="Correct this line" className="h-11 min-w-0 flex-1 rounded-xl bg-inset px-3 text-[15px] outline-none ring-1 ring-white/10 focus:ring-text-1" />
                        <button type="submit" className="h-11 rounded-xl bg-text-1 px-3 text-[13px] font-bold text-ai-ink">{t("Save")}</button>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setEditing(f.id); setDraft(t(f.title)); }}
                        className={cn("group flex min-h-11 items-center gap-1.5 text-left text-[15px] font-semibold leading-snug", f.status === "rejected" && "line-through")}
                        aria-label={t("Correct: {0}", f.title)}
                      >
                        {f.title}
                        <span className="size-3.5 shrink-0 text-text-2 opacity-60 group-hover:opacity-100">{Icon.edit}</span>
                      </button>
                    )}
                    <p className="text-[13px] text-text-2">{f.edited ? t("AI draft was: “{0}”", f.was ?? "") : f.detail}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      {f.edited || f.fromAnswer ? (
                        <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-text-1">{f.edited ? t("You, edited") : t("You")}</span>
                      ) : (
                        <SourceChip>{f.source.who}</SourceChip>
                      )}
                      <span className="text-[12px] italic text-body">“{f.source.quote}”</span>
                    </div>
                    {files.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{files.map((a) => <FileChip key={a.id} a={a} />)}</div>}
                    {(f.carryOver || f.carryWas) && f.status !== "rejected" && (
                      fixing === f.id ? (
                        <FixPicker fact={f} onPick={(fix) => setFix(f.id, fix)} onCancel={() => setFixing(null)} />
                      ) : (
                        <button type="button" onClick={() => setFixing(f.id)} className="group mt-1 flex min-h-11 items-center gap-1.5 text-left text-[12px] font-semibold text-body hover:text-text-1">
                          <span>
                            {f.carryOver ? t("→ Next shift: {0}", f.carryOver) : t("→ No follow-up")}
                            {f.carryWas !== undefined && <span className="font-normal text-text-2"> · {t("your call")}</span>}
                          </span>
                          <span className="size-3.5 shrink-0 text-text-2 opacity-60 group-hover:opacity-100">{Icon.edit}</span>
                        </button>
                      )
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() => set(f.id, f.status === "confirmed" ? "pending" : "confirmed")}
                      aria-label={f.status === "confirmed" ? t("Unconfirm {0}", f.title) : t("Confirm {0}", f.title)}
                      aria-pressed={f.status === "confirmed"}
                      className={cn(
                        "grid size-11 place-items-center rounded-[14px] transition-colors [&_svg]:size-[18px]",
                        f.status === "confirmed" ? "bg-text-1 text-ai-ink" : "border-[1.5px] border-line-dashed bg-transparent text-text-3 hover:border-text-3 hover:text-text-2",
                      )}
                    >
                      {Icon.check}
                    </button>
                    <button
                      type="button"
                      onClick={() => (f.status === "rejected" ? set(f.id, "pending") : reject(f))}
                      aria-label={f.status === "rejected" ? t("Restore {0}", f.title) : t("Not right: {0}", f.title)}
                      className="grid size-11 place-items-center rounded-[14px] bg-transparent text-text-2 hover:text-text-1 [&_svg]:size-[18px]"
                    >
                      {f.status === "rejected" ? Icon.undo : Icon.close}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-3 rounded-[20px] bg-surface p-4">
            <Label>Tell the team?</Label>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px]">Tom · handover before the 11:00 opening</span>
              <Switch on={notify.tom} onChange={(v) => setNotify({ ...notify, tom: v })} label="Send Tom the handover" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[14px]">Dana · morning digest at 09:00</span>
              <Switch on={notify.dana} onChange={(v) => setNotify({ ...notify, dana: v })} label="Send Dana the digest" />
            </div>
            {incidents.length > 0 && <p className="text-[12px] text-text-2">The insurer pack waits for Dana’s decision; nothing goes to the insurer from here.</p>}
          </div>

          <div className={cn(laptop && "lg:hidden")}>
            <ReportStub items={facts} attached={attached} onAdd={onAdd} />
          </div>
        </div>
      </div>
      <div className="relative flex flex-col gap-3 px-5 pb-6 pt-3">
        {mode === "voice" ? (
          <div className="flex items-center gap-3 rounded-[20px] bg-surface px-4 py-4 text-[15px] text-body" role="status">
            <span className="size-2 animate-pulse rounded-full bg-ai" aria-hidden="true" />
            <span>{t("Listening…")} “{live ? liveText : t("Yes, I accept everything")}…”</span>
          </div>
        ) : mode === "type" ? (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); submitTyped(); }}>
            <input id="decide-typed" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Yes, or what to change" aria-label="Your answer" className="glass h-12 min-w-0 flex-1 rounded-full px-4 text-[15px] outline-none placeholder:text-text-2" />
            <button type="submit" className="h-12 rounded-full bg-text-1 px-4 text-sm font-bold text-ai-ink">{t("Send")}</button>
          </form>
        ) : (
          <p className="text-center text-[13px] text-text-3">{t("Say “Yes, I accept everything” to close the report")}</p>
        )}
        <div className="glass mx-auto flex items-center gap-1 rounded-2xl p-1.5">
          <button type="button" onClick={acceptAll} className="h-14 rounded-xl px-4 text-[13px] font-semibold text-body hover:bg-white/5">
            Accept everything
          </button>
          <button type="button" onClick={sayYes} disabled={mode === "voice"} aria-label="Say it" className="grid h-14 w-20 place-items-center rounded-xl bg-text-1 text-ai-ink disabled:opacity-50 [&_svg]:size-6">
            {Icon.mic}
          </button>
          <button type="button" onClick={() => setMode(mode === "type" ? "idle" : "type")} aria-label={mode === "type" ? "Close the keyboard" : "Type your answer"} aria-pressed={mode === "type"} className="grid size-14 place-items-center rounded-xl text-body hover:bg-white/5 [&_svg]:size-5">
            {mode === "type" ? Icon.close : Icon.keyboard}
          </button>
        </div>
      </div>
    </div>
  );
}

// "Another fix?": the AI's suggestion is a proposal, never the only option.
function FixPicker({ fact, onPick, onCancel }: { fact: FactRow; onPick: (fix: string | null) => void; onCancel: () => void }) {
  const t = useT();
  const original = fact.carryWas ?? fact.carryOver;
  const options = [original, ...(fact.alternatives ?? [])].filter((x): x is string => Boolean(x));
  const [mode, setMode] = useState<"pick" | "type" | "voice">("pick");
  const [typed, setTyped] = useState("");
  const [heard, setHeard] = useState("");
  const say = () => {
    // Scripted voice: Sam says the first alternative in her own words.
    const words = t(fact.alternatives?.[0] ?? "I'll sort it myself tomorrow").split(" ");
    setMode("voice");
    words.forEach((_, k) => setTimeout(() => setHeard(words.slice(0, k + 1).join(" ")), 400 + k * 120));
    setTimeout(() => onPick(words.join(" ")), 400 + words.length * 120 + 500);
  };
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-2xl bg-inset p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-text-2">Next shift · another fix?</span>
        <button type="button" onClick={onCancel} aria-label="Close" className="-m-2 grid size-10 place-items-center text-text-2 hover:text-text-1 [&_svg]:size-4">{Icon.close}</button>
      </div>
      {mode === "voice" ? (
        <div className="flex min-h-11 items-center gap-2 rounded-xl bg-surface-2 px-3 text-[14px]" role="status">
          <span className="size-2 shrink-0 animate-pulse rounded-full bg-ai" aria-hidden="true" />
          <span>{heard || <span className="text-text-2">{t("Listening…")}</span>}</span>
        </div>
      ) : mode === "type" ? (
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (typed.trim()) onPick(typed.trim()); }}>
          <input id={`fix-own-${fact.id}`} autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Your fix, in a few words" aria-label="Your fix" className="h-11 min-w-0 flex-1 rounded-xl bg-surface px-3 text-[14px] outline-none ring-1 ring-white/10 placeholder:text-text-3 focus:ring-text-1" />
          <button type="submit" className="h-11 rounded-xl bg-text-1 px-3 text-[13px] font-bold text-ai-ink">{t("Save")}</button>
        </form>
      ) : (
        <>
          <div className="flex flex-col gap-1.5">
            {options.map((o, k) => (
              <button
                key={o}
                type="button"
                onClick={() => onPick(o)}
                className={cn("flex min-h-11 items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[13px] font-semibold", o === fact.carryOver ? "bg-text-1 text-ai-ink" : "bg-surface-2 hover:brightness-125")}
              >
                <span>{o}</span>
                {k === 0 && <span className={cn("shrink-0 text-[10px] font-bold uppercase tracking-[0.08em]", o === fact.carryOver ? "text-ai-ink/60" : "text-text-2")}>AI</span>}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" onClick={say} className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold ring-1 ring-white/10 hover:bg-white/5">
              <span className="size-4">{Icon.mic}</span>{t("Say it")}
            </button>
            <button type="button" onClick={() => setMode("type")} className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold ring-1 ring-white/10 hover:bg-white/5">
              <span className="size-4">{Icon.keyboard}</span>{t("Type it")}
            </button>
            <button type="button" onClick={() => onPick(null)} className="h-11 rounded-xl px-3 text-[13px] font-semibold text-text-2 hover:text-text-1">
              No follow-up
            </button>
          </div>
        </>
      )}
    </div>
  );
}


// ---------------------------------------------------------------------------
// 4 · The agent asks. First what the insurer still needs about the incident (while it's fresh),
// then the recall questions (cognitive interview). One at a time; a tap, a few words, or say it.

type Turn = {
  id: string;
  kind: "gap" | "recall";
  chip: string;
  text: string;
  from: string;
  why: string;
  chipsFrom: string;
  category: CategoryId;
  answers: { label: string; adds?: Omit<Fact, "id" | "source">; fill?: string }[];
  fieldId?: string;
  said?: string;
  fact?: string;
};

const gapTurns = (fields: IncidentField[], gaps: Record<string, string>): Turn[] =>
  fields
    .filter((f) => f.value === null && !gaps[f.id] && f.ask)
    .sort((a, b) => gapPriority.indexOf(a.id) - gapPriority.indexOf(b.id))
    .slice(0, MAX_GAP_QUESTIONS)
    .map((f) => ({
      id: `g-${f.id}`,
      kind: "gap" as const,
      chip: "Incident · 01:40",
      text: f.ask!,
      from: f.label,
      why: "The insurer’s form needs this and nothing in the night’s data says it, so the agent asks instead of guessing, while the event is still fresh. At most four of these; anything else stays open in the record, honestly marked.",
      chipsFrom: "The usual answers for this field on incident forms. “Don’t know” is always allowed and is logged as such.",
      category: "incidents" as const,
      answers: [...(f.options ?? []).map((o) => ({ label: o, fill: o })), ...((f.options ?? []).includes("Not known") ? [] : [{ label: "Don’t know", fill: "Not known" }])],
      fieldId: f.id,
      said: f.said,
    }));

const recallTurn = (q: RecallQuestion): Turn => ({
  id: q.id, kind: "recall", chip: q.fact, text: q.text, from: q.from, why: q.why, chipsFrom: q.chipsFrom, category: q.category, answers: q.answers, fact: q.fact,
});

function RecallScreen({
  night, elapsed, path, facts, gaps, setGaps, onAdd, onUndo, onBack, onNext,
}: {
  night: NightData; elapsed: string; path: Path; facts: FactRow[];
  gaps: Record<string, string>; setGaps: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onAdd: (f: FactRow) => void; onUndo: (id: string) => void; onBack: () => void; onNext: () => void;
}) {
  const t = useT();
  const hasIncident = facts.some((f) => f.incident && f.status !== "rejected");
  const incidentTonight = hasIncident || night.reports.some((c) => c.urgent);
  const recall = night.questions(path, incidentTonight);
  const [turns, setTurns] = useState<Turn[]>(() => [...(hasIncident ? gapTurns(night.fields, gaps) : []), ...recall.map(recallTurn)]);
  const [i, setI] = useState(0);
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState("");
  const [speaking, setSpeaking] = useState(true);
  const [saying, setSaying] = useState(false);
  const q = turns[i];
  const quietN = questionCount({ path, incidentTonight: false });
  const gapCount = turns.filter((x) => x.kind === "gap").length;

  const fill = (fieldId: string, v: string) => setGaps((g) => ({ ...g, [fieldId]: v }));
  const unfill = (fieldId: string) => setGaps((g) => { const n = { ...g }; delete n[fieldId]; return n; });

  const advance = (inserted: Turn[] = []) => {
    setSaying(false);
    const total = turns.length + inserted.length;
    if (inserted.length) setTurns((ts) => [...ts.slice(0, i + 1), ...inserted, ...ts.slice(i + 1)]);
    if (i + 1 >= total) onNext();
    else { setI(i + 1); setSpeaking(true); }
  };
  const last = () => i + 1 >= turns.length;
  const answer = (a: Turn["answers"][number]) => {
    if (q.kind === "gap" && q.fieldId) {
      fill(q.fieldId, a.fill ?? a.label);
      if (!last()) toast(t("Added to the incident: {0}", a.fill ?? a.label), { action: { label: t("Undo"), onClick: () => unfill(q.fieldId!) } });
      return advance();
    }
    let inserted: Turn[] = [];
    if (a.adds) {
      const id = `a-${q.id}`;
      onAdd({ ...a.adds, id, status: "confirmed", fromAnswer: true, source: { who: "Your answer", quote: a.label } });
      // Sam just told the agent about trouble nobody reported: ask what the insurer needs, right now.
      if (a.adds.incident && !hasIncident && !turns.some((x) => x.kind === "gap")) inserted = gapTurns(night.fields, gaps);
      if (!last() || inserted.length) toast(a.adds.carryOver?.startsWith("Till 2") ? t("Asked the bar team. The answer goes to you and Tom’s handover.") : t("Added: {0}", a.adds.title), { action: { label: t("Undo"), onClick: () => onUndo(id) } });
    } else if (!last()) {
      toast(t("Noted: nothing to add"));
    }
    advance(inserted);
  };
  const submitTyped = () => {
    const v = typed.trim();
    if (!v) return;
    setTyped("");
    setTyping(false);
    if (q.kind === "gap" && q.fieldId) return answer({ label: v, fill: v });
    const id = `t-${q.id}`;
    onAdd({ id, category: [...coveredBy(v)][0] ?? q.category, title: v, detail: t("Your words · {0}", (q.fact ?? "").split(" · ")[0]), status: "confirmed", fromAnswer: true, source: { who: "Your answer", quote: v } });
    toast(t("Added: {0}", v), { action: { label: t("Undo"), onClick: () => onUndo(id) } });
    advance();
  };
  // Scripted voice: a gap gets Sam's own words; a recall question "hears" its first common answer.
  const heardText = q.kind === "gap" ? t(q.said ?? "I'll check and add it in the morning") : t(q.answers[0]?.label ?? "");
  const live = useVoice().mic === "live" && canListen();
  const [liveText, setLiveText] = useState("");
  const sayIt = () => {
    setSaying(true);
    if (!live) {
      setTimeout(() => (q.kind === "gap" ? answer({ label: heardText, fill: heardText }) : answer(q.answers[0])), 2400);
      return;
    }
    setLiveText("");
    let last = "";
    listen({
      continuous: false,
      onText: (x) => { last = x; setLiveText(x); },
      onEnd: () => {
        const v = last.trim();
        if (!v) return setSaying(false);
        if (q.kind === "gap") return answer({ label: v, fill: v });
        // A spoken answer that names one of the chips counts as that chip; anything else is kept as said.
        const hit = q.answers.find((a) => v.toLowerCase().includes(t(a.label).toLowerCase().split(/[ ,]/)[0]));
        if (hit) return answer(hit);
        const id = `t-${q.id}`;
        onAdd({ id, category: [...coveredBy(v)][0] ?? q.category, title: v, detail: t("Your words · {0}", (q.fact ?? "").split(" · ")[0]), status: "confirmed", fromAnswer: true, source: { who: "Your answer", quote: v } });
        advance();
      },
    });
  };
  const agentState: AgentState = saying ? "listening" : speaking ? "speaking" : "idle";

  const progress = (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[13px] font-semibold">{q.kind === "gap" ? t("About the incident · {0} of {1}", i + 1, turns.length) : t("Anything else? · {0} of {1}", i + 1, turns.length)}</span>
      <div className="flex gap-1" aria-hidden="true">
        {turns.map((x, k) => (
          <span key={x.id} className={cn("h-1 w-6 rounded-full", k < i ? "bg-text-1" : k === i ? (x.kind === "gap" ? "bg-attention" : "bg-ai") : "bg-surface-2")} />
        ))}
      </div>
    </div>
  );

  const count =
    night.reports.length === 0
      ? t("{0} questions: nobody on the team reported anything, so the agent covers the floor, the till and the door itself.", recall.length)
      : [
          t("{0} questions tonight: 1 after a brain-dump, 2 when guided.", recall.length),
          incidentTonight ? t("+1 because there was an incident.") : "",
          venue.incidentsLast30Days >= 3 ? t("+1 because this venue logged {0} incidents in {1} days ({2} fights at the bar end).", incidentHistory.total, incidentHistory.days, incidentHistory.fightsAtBarEnd) : "",
          t("A quiet night here gets {0}.", quietN),
        ].filter(Boolean).join(" ");

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      <div className="rays" />
      <TopBar left={<IconButton onClick={onBack} aria-label="Back">{Icon.back}</IconButton>} title={progress} />
      <div className="relative flex flex-col items-center gap-3 px-6 pt-3">
        <span key={q.id} className="inline-flex items-center gap-2 rounded-full bg-inset px-3.5 py-2 text-[13px] font-semibold">
          <span className={cn("size-2 rounded-full", q.kind === "gap" ? "bg-attention" : "bg-ai")} aria-hidden="true" />
          {q.chip}
        </span>
        <AgentSlot state={agentState} size="mid" />
      </div>
      <div className="no-scrollbar relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <div key={q.id} className="flex flex-1 flex-col items-center gap-3 px-6 pt-3 text-center">
          <SpeakText text={q.text} onDone={() => setSpeaking(false)} className="text-[24px] font-semibold leading-[1.3] tracking-[-0.02em] text-balance" />
          <p className="text-xs text-text-2">{q.kind === "gap" ? t("For the insurer · {0}", q.from) : q.from}</p>
        </div>
      </div>
      <div className="relative flex flex-col gap-3 px-5 pb-6 pt-3">
        {typing ? (
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); submitTyped(); }}>
            <input id="recall-typed" autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="A few words is enough" aria-label="Type your answer" className="glass h-12 min-w-0 flex-1 rounded-full px-4 text-[15px] outline-none placeholder:text-text-2" />
            <button type="submit" className="h-12 rounded-full bg-text-1 px-4 text-sm font-bold text-ai-ink">{t("Add")}</button>
          </form>
        ) : saying ? (
          <div className="flex items-center gap-3 rounded-[20px] bg-surface px-4 py-4 text-[15px] text-body" role="status">
            <span className="size-2 animate-pulse rounded-full bg-ai" aria-hidden="true" />
            <span>{t("Listening…")} “{live ? liveText : heardText.toLowerCase()}…”</span>
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-2">
            {q.answers.map((a) => (
              <button key={a.label} type="button" onClick={() => answer(a)} className="glass h-11 rounded-full px-4 text-[14px] font-semibold hover:bg-white/10">
                {a.label}
              </button>
            ))}
          </div>
        )}
        <div className="glass mx-auto flex items-center gap-1 rounded-2xl p-1.5">
          <button type="button" onClick={() => (q.kind === "gap" ? advance() : answer({ label: "Nothing to add" }))} className="h-14 rounded-xl px-4 text-[13px] font-semibold text-body hover:bg-white/5">
            {q.kind === "gap" ? t("Skip for now") : t("Nothing to add")}
          </button>
          <button type="button" onClick={sayIt} disabled={saying} aria-label="Say it" className="grid h-14 w-20 place-items-center rounded-xl bg-text-1 text-ai-ink disabled:opacity-50 [&_svg]:size-6">
            {Icon.mic}
          </button>
          <button type="button" onClick={() => setTyping((x) => !x)} aria-label={typing ? "Close the keyboard" : "Type your answer"} aria-pressed={typing} className="grid size-14 place-items-center rounded-xl text-body hover:bg-white/5 [&_svg]:size-5">
            {typing ? Icon.close : Icon.keyboard}
          </button>
        </div>
      </div>
      <Note>
        <p><b className="font-semibold text-text-1">{t("Why this question.")}</b> {t(q.why)}</p>
        <p><b className="font-semibold text-text-1">{t("Where the answer chips come from.")}</b> {t(q.chipsFrom)} {t("The mic and the keyboard take anything else.")}</p>
        <p><b className="font-semibold text-text-1">{t("How many questions.")}</b> {gapCount ? `${t("First {0} about the incident.", gapCount)} ${count}` : count}</p>
      </Note>
    </div>
  );
}


// ---------------------------------------------------------------------------
// 5 · Incident: insurer fields, AI-filled, gaps the manager must close or mark unknown.

function IncidentScreen({
  night, elapsed, gaps, setGaps, evidence, onBack, onConfirm,
}: {
  night: NightData; elapsed: string; gaps: Record<string, string>;
  setGaps: React.Dispatch<React.SetStateAction<Record<string, string>>>; evidence: Attachment[]; onBack: () => void; onConfirm: () => void;
}) {
  const incidentFields = night.fields;
  const open = incidentFields.filter((f) => f.value === null && !gaps[f.id]);
  const fill = (id: string, v: string) => setGaps((g) => ({ ...g, [id]: v }));
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  // Own words for a gap: by voice (scripted transcript) or typed.
  const [answering, setAnswering] = useState<{ id: string; mode: "voice" | "type" } | null>(null);
  const [typedGap, setTypedGap] = useState("");
  const [heard, setHeard] = useState("");
  const t = useT();
  const sayGap = (id: string, said?: string) => {
    // Translate the whole answer first; the words then appear one by one.
    const words = t(said ?? "I'll check and add it in the morning").split(" ");
    setHeard("");
    setAnswering({ id, mode: "voice" });
    words.forEach((_, k) => setTimeout(() => setHeard(words.slice(0, k + 1).join(" ")), 450 + k * 120));
    setTimeout(() => { fill(id, words.join(" ")); setAnswering(null); setHeard(""); }, 450 + words.length * 120 + 500);
  };
  const minimum = ["when", "where", "type", "what"].map((id) => incidentFields.find((f) => f.id === id)).filter((f): f is IncidentField => Boolean(f));
  return (
    <>
      <TopBar
        left={<IconButton onClick={onBack} aria-label="Back">{Icon.back}</IconButton>}
        title={<span className="text-[13px] font-semibold">Incident · 01:40</span>}
      />
      <div className="no-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-5 pb-4">
        <div className="flex flex-col gap-4 pt-2">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[26px] font-bold leading-[1.15] tracking-[-0.03em]">Ready for the insurer, almost.</h1>
            <p className="text-sm text-body">
              {night.reports.length
                ? "I drafted it from your voice note and Mike’s reports (he sent the guest’s name and the camera). Close the gaps, or say you don’t know. An honest gap beats a guess."
                : "Nobody on the team reported this, so I only have your words. That leaves more gaps. Close them, or say you don’t know. An honest gap beats a guess."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5" aria-label="The minimum for every incident">
            {minimum.map((f) => {
              const ok = Boolean(gaps[f.id] ?? f.value);
              return (
                <span key={f.id} className={cn("inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-[12px] font-semibold", ok ? "bg-surface text-text-1" : "bg-attention/15 text-attention")}>
                  {ok && <span className="size-3.5">{Icon.check}</span>}
                  {f.label}
                </span>
              );
            })}
          </div>
          <div className={cn("sticky top-0 z-10 flex items-center justify-between rounded-2xl px-4 py-2.5 outline outline-8 outline-bg", open.length ? "bg-[color-mix(in_oklab,var(--bt-attention)_15%,var(--bt-bg))]" : "bg-inset")}>
            <span className={cn("text-[13px] font-bold", open.length ? "text-attention" : "text-text-1")}>
              {open.length ? t("{0} gaps left", open.length) : t("No gaps left")}
            </span>
            <span className="text-xs text-text-2">{t("{0} fields · 3rd person", incidentFields.length)}</span>
          </div>
          <div className="overflow-hidden rounded-[20px] bg-surface">
            {incidentFields.map((f, i) => {
              const filled = gaps[f.id] ?? f.value;
              const isGap = f.value === null;
              const edited = !isGap && gaps[f.id] !== undefined;
              return (
                <div key={f.id} id={`gap-${f.id}`} className={cn("flex scroll-mt-16 flex-col gap-1.5 px-4 py-3.5", i < incidentFields.length - 1 && "border-b border-surface-2")}>
                  <div className="flex items-center justify-between gap-2">
                    <Label>{f.label}</Label>
                    {filled && (isGap || edited ? <span className="text-[11px] font-semibold text-text-2">{edited ? t("You, edited") : t("You")}</span> : <SourceChip>{f.source}</SourceChip>)}
                  </div>
                  {editing === f.id ? (
                    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); fill(f.id, draft.trim() || t(f.value ?? "")); setEditing(null); }}>
                      <input id={`fix-${f.id}`} autoFocus value={draft} onChange={(e) => setDraft(e.target.value)} aria-label={t("Correct {0}", f.label)} className="h-11 min-w-0 flex-1 rounded-xl bg-inset px-3 text-[15px] outline-none ring-1 ring-white/10 focus:ring-text-1" />
                      <button type="submit" className="h-11 rounded-xl bg-text-1 px-3 text-[13px] font-bold text-ai-ink">{t("Save")}</button>
                    </form>
                  ) : filled ? (
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-[15px] leading-snug", filled === "Not known" && "text-text-2")}>{filled}</p>
                      {!isGap && (
                        <button type="button" onClick={() => { setEditing(f.id); setDraft(t(filled)); }} className="-my-2 min-h-11 shrink-0 px-2 text-xs font-semibold text-text-2 underline-offset-2 hover:underline">
                          {t("Edit")}
                        </button>
                      )}
                      {isGap && (
                        <button type="button" onClick={() => setGaps((g) => { const n = { ...g }; delete n[f.id]; return n; })} className="-my-2 min-h-11 shrink-0 px-2 text-xs font-semibold text-text-2 underline-offset-2 hover:underline">
                          {t("Change")}
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2 rounded-2xl border-[1.5px] border-dashed border-attention/70 p-3">
                      <span className="gap-pulse text-[14px] font-semibold text-attention">[ {t(f.placeholder ?? "Choose one")} ]</span>
                      {answering?.id === f.id && answering.mode === "voice" ? (
                        <div className="flex min-h-11 items-center gap-2 rounded-xl bg-surface-2 px-3 text-[14px]" role="status">
                          <span className="size-2 shrink-0 animate-pulse rounded-full bg-ai" aria-hidden="true" />
                          <span>{heard || <span className="text-text-2">{t("Listening…")}</span>}</span>
                        </div>
                      ) : answering?.id === f.id && answering.mode === "type" ? (
                        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (typedGap.trim()) { fill(f.id, typedGap.trim()); setAnswering(null); } }}>
                          <input
                            id={`gap-input-${f.id}`}
                            autoFocus
                            value={typedGap}
                            onChange={(e) => setTypedGap(e.target.value)}
                            placeholder="In your own words"
                            aria-label={t("Your answer: {0}", f.label)}
                            className="h-11 min-w-0 flex-1 rounded-xl bg-inset px-3 text-[15px] outline-none ring-1 ring-white/10 placeholder:text-text-3 focus:ring-text-1"
                          />
                          <button type="submit" className="h-11 rounded-xl bg-text-1 px-3 text-[13px] font-bold text-ai-ink">{t("Save")}</button>
                        </form>
                      ) : (
                        <>
                          {(f.options ?? []).length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {(f.options ?? []).map((o) => (
                                <button key={o} type="button" onClick={() => fill(f.id, o)} className="h-11 rounded-xl bg-surface-2 px-3.5 text-[13px] font-semibold hover:brightness-125">
                                  {o}
                                </button>
                              ))}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button type="button" onClick={() => sayGap(f.id, f.said)} className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold ring-1 ring-white/10 hover:bg-white/5">
                              <span className="size-4">{Icon.mic}</span>{t("Say it")}
                            </button>
                            <button type="button" onClick={() => { setTypedGap(""); setAnswering({ id: f.id, mode: "type" }); }} className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold ring-1 ring-white/10 hover:bg-white/5">
                              <span className="size-4">{Icon.keyboard}</span>{t("Type it")}
                            </button>
                            {!(f.options ?? []).includes("Not known") && (
                              <button type="button" onClick={() => fill(f.id, "Not known")} className="h-11 rounded-xl px-3 text-[13px] font-semibold text-text-2 hover:text-text-1">
                                Don’t know
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {evidence.length > 0 && (
            <div className="flex flex-col gap-2">
              <Label>Evidence you added</Label>
              <div className="flex flex-wrap gap-2">{evidence.map((a) => <FileChip key={a.id} a={a} />)}</div>
            </div>
          )}
          <p className="text-xs leading-relaxed text-text-2">
            {night.reports.length ? t("AI drafted from 4 sources (your voice note, Mike’s report and voice note, the rota).") : t("AI drafted from your words and the rota only.")}{" "}
            {t("Nothing was filled without a source. Tap Edit to correct any line; the insurer sees who wrote what.")}
          </p>
        </div>
      </div>
      <div className="border-t border-white/5 bg-sheet px-5 pb-6 pt-3">
        <Pill
          className="w-full"
          variant={open.length ? "attention" : "primary"}
          onClick={() => {
            if (!open.length) return onConfirm();
            document.getElementById(`gap-${open[0].id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        >
          {open.length ? t("Next gap ↓ · {0} left", open.length) : t("Confirm incident")}
        </Pill>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// 6 · Done

function DoneScreen({
  night, startedAt, facts, gaps, attached, notify, onAddNote,
}: {
  night: NightData; startedAt: number; facts: FactRow[]; gaps: Record<string, string>; attached: Attached[]; notify: Notify; onAddNote: (text: string) => void;
}) {
  const t = useT();
  // "Want to add something?": one more line after closing, by voice or typed. It goes into the sent report.
  const [adding, setAdding] = useState<null | "ask" | "voice" | "type">(null);
  const [typedNote, setTypedNote] = useState("");
  const [heardNote, setHeardNote] = useState("");
  const liveMic = useVoice().mic === "live" && canListen();
  const addNote = (text: string) => {
    const v = text.trim();
    if (v) onAddNote(v);
    setAdding(null);
    setTypedNote("");
    setHeardNote("");
  };
  const sayNote = () => {
    setAdding("voice");
    if (!liveMic) {
      const words = t("The hand dryer in the gents is broken").split(" ");
      words.forEach((_, k) => setTimeout(() => setHeardNote(words.slice(0, k + 1).join(" ")), 400 + k * 140));
      setTimeout(() => addNote(words.join(" ")), 400 + words.length * 140 + 600);
      return;
    }
    let last = "";
    listen({ continuous: false, onText: (x) => { last = x; setHeardNote(x); }, onEnd: () => addNote(last) });
  };
  const [ms] = useState(() => Date.now() - startedAt);
  const final = mmss(ms);
  const known = new Set([...handover.open.map((o) => o.text)]);
  const extra = facts.filter((f) => f.fromAnswer && f.carryOver && !known.has(f.carryOver));
  const hasIncident = facts.some((f) => f.incident && f.status !== "rejected");
  // Fixes Sam swapped on "caught": the AI's suggestion → her pick (null = dropped).
  const changed: Record<string, string | null> = Object.fromEntries(facts.filter((f) => f.carryWas).map((f) => [f.carryWas!, f.carryOver ?? null]));
  const swap = (text: string) => (text in changed ? changed[text] : text);
  // The team night has a written handover; a solo night carries over only what Sam confirmed.
  const carry = (
    night.scenario === "team"
      ? [
          ...handover.top.map((line, i) => {
            const from = handover.topFrom[i];
            const text = from && from in changed ? changed[from] : line.split(".")[0];
            return { text, owner: "Tom", due: "before open" };
          }),
          ...handover.open.map((o) => ({ text: swap(o.text), owner: o.owner, due: o.due })),
          ...extra.map((f) => ({ text: f.carryOver!, owner: f.owner ?? "Tom", due: f.owner ? "before 11:00" : "this week" })),
        ]
      : facts
          .filter((f) => f.carryOver && f.status !== "rejected")
          .map((f) => ({ text: f.carryOver!, owner: f.owner ?? "Tom", due: f.owner ? "before 11:00" : "before open" }))
  ).filter((c): c is { text: string; owner: string; due: string } => Boolean(c.text));
  const unknown = Object.values(gaps).filter((v) => v === "Not known").length;
  const live = facts.filter((f) => f.status !== "rejected");
  const sections = categories.filter((c) => live.some((f) => f.category === c.id) || attached.some((x) => x.to === c.id)).length;
  useEffect(() => {
    saveClosed({
      gaps,
      extras: extra.map((f) => ({ text: f.carryOver!, owner: f.owner ?? "Tom", due: f.owner ? "before 11:00" : "this week" })),
      notes: facts
        .filter((f) => f.status !== "rejected" && (f.edited || (f.fromAnswer && !f.carryOver)))
        .map((f) => ({ text: f.title, about: f.edited ? f.category : undefined })),
      closedIn: final,
      changed,
      attached: attached.map((x) => ({ reading: x.a.kind === "document" ? (x.a.name ?? x.a.reading) : x.a.reading, time: x.a.time, to: x.to })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facts.length]);
  // Who gets what. Not links: Sam doesn't open these (the other views are in "Other personas").
  const rows = [
    { who: "Tom · opens at 11:00", sent: notify.tom, what: notify.tom ? t("Handover: {0} things before open", 3) : t("Not sent. You chose to tell him yourself") },
    { who: "Dana · owner", sent: notify.dana, what: notify.dana ? t("Morning digest at 09:00") : t("Not sent. You chose to tell her yourself") },
    ...(hasIncident
      ? [{ who: "Insurer pack · Dana decides", sent: true, what: unknown ? t("Record ready, {0} fields, {1} marked not known. Dana chooses whether to notify", night.fields.length, unknown) : t("Record ready, {0} fields. Dana chooses whether to notify", night.fields.length) }]
      : []),
  ];
  const sentAt = `03:${String(2 + Math.floor(ms / 60000)).padStart(2, "0")}`;
  return (
    <>
      <div className="rays" />
      {/* The moment it's over: the ribbons settle, a check draws itself, Sam is told to go home. */}
      <div className="relative flex flex-col items-center px-5 pt-8 text-center">
        <div className="relative flex w-full items-center justify-center">
          <AgentSlot state="done" size="mid" />
          <span className="done-badge absolute left-1/2 top-1/2 grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-bg ring-1 ring-white/25" role="img" aria-label={t("Report sent · {0}", sentAt)}>
            <svg viewBox="0 0 52 52" className="size-12 text-text-1" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle className="done-ring" cx="26" cy="26" r="24" />
              <path className="done-tick" d="M16 27.5l6.5 6.5L36.5 19" />
            </svg>
          </span>
        </div>
        <Label className="mt-4">{t("Report sent · {0}", sentAt)}</Label>
        <h1 className="mt-2 text-balance text-[34px] font-semibold leading-[1.1] tracking-[-0.03em]">{t("That’s it. Go home, Sam.")}</h1>
        <p className="mt-3 text-[14px] text-text-2">
          {attached.length
            ? t("{0} of {1} sections filled, {2} attachments. The rest stays empty, that’s fine.", sections, categories.length, attached.length)
            : t("{0} of {1} sections filled. The rest stays empty, that’s fine.", sections, categories.length)}
        </p>
        {adding === null ? (
          <Pill variant="secondary" size="md" className="mt-4" onClick={() => setAdding("ask")}>
            <span className="size-4">{Icon.plus}</span>{t("Want to add something?")}
          </Pill>
        ) : (
          <div className="mt-4 flex w-full max-w-[420px] flex-col items-center gap-3 rounded-[20px] bg-surface p-4">
            <SpeakText text="What would you like to add?" className="text-[17px] font-semibold" />
            {adding === "voice" ? (
              <div className="flex min-h-11 w-full items-center gap-2 rounded-xl bg-surface-2 px-3 text-left text-[14px]" role="status">
                <span className="size-2 shrink-0 animate-pulse rounded-full bg-ai" aria-hidden="true" />
                <span>{heardNote || <span className="text-text-2">{t("Listening…")}</span>}</span>
              </div>
            ) : adding === "type" ? (
              <form className="flex w-full gap-2" onSubmit={(e) => { e.preventDefault(); addNote(typedNote); }}>
                <input id="done-note" autoFocus value={typedNote} onChange={(e) => setTypedNote(e.target.value)} placeholder="A few words is enough" aria-label="What would you like to add?" className="h-11 min-w-0 flex-1 rounded-xl bg-inset px-3 text-[15px] outline-none ring-1 ring-white/10 placeholder:text-text-3 focus:ring-text-1" />
                <button type="submit" className="h-11 rounded-xl bg-text-1 px-3 text-[13px] font-bold text-ai-ink">{t("Add")}</button>
              </form>
            ) : (
              <div className="flex flex-wrap justify-center gap-1.5">
                <button type="button" onClick={sayNote} className="flex h-11 items-center gap-1.5 rounded-xl bg-text-1 px-4 text-[13px] font-semibold text-ai-ink">
                  <span className="size-4">{Icon.mic}</span>{t("Say it")}
                </button>
                <button type="button" onClick={() => setAdding("type")} className="flex h-11 items-center gap-1.5 rounded-xl px-3 text-[13px] font-semibold ring-1 ring-white/10 hover:bg-white/5">
                  <span className="size-4">{Icon.keyboard}</span>{t("Type it")}
                </button>
                <button type="button" onClick={() => setAdding(null)} className="h-11 rounded-xl px-3 text-[13px] font-semibold text-text-2 hover:text-text-1">
                  {t("Cancel")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="no-scrollbar relative mt-5 flex-1 overflow-y-auto overflow-x-hidden px-5 pb-6">
        <div className="relative flex flex-col gap-3">
          <Label>Already on its way</Label>
          <div className="overflow-hidden rounded-[20px] bg-surface">
            {rows.map((r, i) => {
              const sent = r.sent;
              return (
                <div key={r.who} className={cn("flex items-start gap-3 px-4 py-3", i < rows.length - 1 && "border-b border-surface-2")}>
                  <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full [&_svg]:size-3", sent ? "bg-text-1 text-ai-ink" : "border-[1.5px] border-line-dashed text-text-3")}>{sent ? Icon.check : null}</span>
                  <div>
                    <p className="text-[14px] font-semibold">{r.who}</p>
                    <p className="text-[13px] text-text-2">{r.what}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <Label className="mt-2">{t("Carried to Sunday · {0}", carry.length)}</Label>
          <div className="overflow-hidden rounded-[20px] bg-surface/60">
            {carry.map((c, i) => (
              <div key={c.text} className={cn("flex items-center gap-3 px-4 py-2.5", i < carry.length - 1 && "border-b border-surface-2")}>
                <span className="size-4 shrink-0 rounded-md border-[1.5px] border-line-dashed" aria-hidden="true" />
                <span className="flex-1 text-[13px] text-body">{c.text}</span>
                <span className="shrink-0 text-[11px] text-text-2">{t(c.owner)} · {t(c.due)}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-text-2">You can still edit until 09:00. After that, changes are logged.</p>
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Safety net: 15 minutes after close with no report, the agent calls.

const CALL = [
  { who: "agent", text: "Hi Sam. Quick one so nothing gets lost. Mike flagged a fight at 1:40, a guest cut his hand. Anything to add?" },
  { who: "sam", text: "Yeah, Jess did first aid, it wasn’t deep." },
  { who: "agent", text: "Got it. Was an ambulance offered?" },
  { who: "sam", text: "Offered, he said no. Left with his mates." },
  { who: "agent", text: "Last one. Till 2 was £45 short. Anything the morning team needs to know?" },
  { who: "sam", text: "IPA’s out, order a keg." },
  { who: "agent", text: "Done. Filed. Three details left for you at 9: which hand, what happened to the other guest, and whether the camera 3 clip is saved. Get home safe." },
] as const;

function CallScreen({ onEnd }: { onEnd: () => void }) {
  const t = useT();
  const [phase, setPhase] = useState<"ringing" | "live" | "ended">("ringing");
  const [turn, setTurn] = useState(0);
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase]);
  useEffect(() => {
    if (phase !== "live") return;
    if (turn >= CALL.length) { const id = setTimeout(() => setPhase("ended"), 1200); return () => clearTimeout(id); }
    const id = setTimeout(() => setTurn((x) => x + 1), CALL[turn].who === "agent" ? 3200 : 2600);
    return () => clearTimeout(id);
  }, [phase, turn]);
  const current = CALL[Math.max(0, turn - 1)];
  useEffect(() => {
    if (phase === "live" && turn > 0 && CALL[turn - 1].who === "agent") speak(t(CALL[turn - 1].text));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, turn]);
  const state: AgentState = phase === "ringing" ? "idle" : phase === "ended" ? "idle" : current?.who === "agent" ? "speaking" : "listening";

  return (
    <div className="relative flex h-full flex-col overflow-hidden px-5 pb-8 pt-14">
      <div className="rays" />
      <div className="relative flex flex-col items-center gap-1 text-center">
        <span className="text-[13px] font-semibold text-body">{phase === "ringing" ? t("03:15 · incoming call") : phase === "live" ? t("On the call") : t("Call ended")}</span>
        <h1 className="text-[30px] font-bold tracking-[-0.03em]" data-no-translate>Shift Report</h1>
        <p className="text-sm text-text-2">{phase === "ringing" ? "Tonight isn’t closed yet. 3 questions, about 2 minutes." : "Your agent"}</p>
      </div>
      <div className="relative my-6 flex items-center justify-center">
        <AgentSlot state={state} size="hero" />
      </div>
      <div className="no-scrollbar relative flex flex-1 flex-col justify-end gap-2 overflow-y-auto overflow-x-hidden">
        {phase !== "ringing" &&
          CALL.slice(Math.max(0, turn - 3), turn).map((l, k) => (
            <p key={k + turn} className={cn("word-in text-[16px] leading-snug", l.who === "agent" ? "text-center font-semibold" : "text-center text-text-2")}>
              {l.who === "sam" ? `“${t(l.text)}”` : l.text}
            </p>
          ))}
        {phase === "ended" && (
          <div className="mt-3 flex flex-col gap-1 rounded-[20px] bg-surface p-4 text-center">
            <span className="text-[15px] font-bold">{t("Filed by phone")}</span>
            <span className="text-[13px] text-body">Incident logged with 3 gaps: injury detail, other guest, CCTV. I’ll remind you at 09:00.</span>
          </div>
        )}
      </div>
      <div className="relative mt-5 flex justify-center gap-10">
        {phase === "ringing" ? (
          <>
            <button type="button" onClick={onEnd} className="flex flex-col items-center gap-2 text-xs font-semibold text-body">
              <span className="grid size-16 place-items-center rounded-full bg-surface-2 text-text-1 [&_svg]:size-6">{Icon.close}</span>
              Later
            </button>
            <button type="button" onClick={() => { setPhase("live"); setTurn(1); }} className="flex flex-col items-center gap-2 text-xs font-semibold text-body">
              <span className="grid size-16 place-items-center rounded-full bg-text-1 text-ai-ink [&_svg]:size-6">{Icon.phone}</span>
              Answer
            </button>
          </>
        ) : (
          <button type="button" onClick={onEnd} className="flex flex-col items-center gap-2 text-xs font-semibold text-body">
            <span className="grid size-16 place-items-center rounded-full bg-attention text-ai-ink [&_svg]:size-6">{Icon.close}</span>
            {phase === "ended" ? "Close" : "Hang up"}
          </button>
        )}
      </div>
    </div>
  );
}
