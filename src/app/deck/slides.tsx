import type { CSSProperties, ReactNode } from "react";

// Slide content for /deck. Every string is written twice, Polish first (Filip's own wording), then English.
// Layout is a fixed 1920 × 1080 canvas, so positions below are in canvas pixels (96px margins, like Filip's site decks).

export type T = <X>(pl: X, en: X) => X;
export type Lang = "pl" | "en";
type P = { t: T; lang: Lang };
export type SlideDef = { id: string; chapter: 0 | 1 | 2 | null; light?: boolean; Body: (p: P) => ReactNode };

export const CHAPTERS: { pl: string; en: string }[] = [
  { pl: "Problem", en: "Problem" },
  { pl: "Rozwiązanie", en: "Solution" },
  { pl: "Proces", en: "Process" },
];

/** Polish typesetting: one-letter words and "np." don't end a line, and a dash doesn't start one. */
const SHORT = /(^|[\s(„])([aiouwzAIOUWZ]|np\.) /g;
function tie(s: string): string {
  // twice, so runs like "i w " are both tied (each match swallows the space before the next one)
  return s.replace(SHORT, "$1$2\u00a0").replace(SHORT, "$1$2\u00a0").replace(/ ([—–])/g, "\u00a0$1");
}

/** Picks the Polish or English variant; Polish strings (and string lists) get tie() on the way out. */
export function makeT(lang: Lang): T {
  return <X,>(pl: X, en: X): X => {
    if (lang !== "pl") return en;
    if (typeof pl === "string") return tie(pl) as unknown as X;
    if (Array.isArray(pl)) return pl.map((x) => (typeof x === "string" ? tie(x) : x)) as unknown as X;
    return pl;
  };
}

/** Entrance delay step for .rv parts, merged with any positioning style. */
const d = (n: number, style?: CSSProperties) => ({ "--d": n, ...style }) as CSSProperties;
const abs = (style: CSSProperties): CSSProperties => ({ position: "absolute", ...style });

/* ── Screens of the prototype ────────────────────────────────────────────
   Shot per language at 2× into public/deck/{pl,en}/ (web app: the 1440 × 860 app window at 1600 × 1000;
   phones: the 390 × 800 screen). */
const shot = (lang: Lang, name: string) => `/deck/${lang}/${name}.jpg`;

/** [x, y, width, height] of the part to show, in the app window's CSS pixels. */
type Crop = [number, number, number, number];
const WINDOW = { w: 1440, h: 860 };

/** Part of a web-app screenshot: the frame takes the crop's proportions, the image is scaled and shifted inside. */
function Shot({ src, crop = [0, 0, WINDOW.w, WINDOW.h], className, style, children }: { src: string; crop?: Crop; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const [x, y, w, h] = crop;
  return (
    <div className={`fwd-img fwd-shot ${className ?? ""}`} style={{ aspectRatio: `${w} / ${h}`, ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static screenshot inside a scaled canvas */}
      <img src={src} alt="" decoding="async" style={{ width: `${(WINDOW.w / w) * 100}%`, left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` }} />
      {children}
    </div>
  );
}

/** A phone screen in a thin bezel. */
function Phone({ src, className, style }: { src: string; className?: string; style?: CSSProperties }) {
  return (
    <div className={`fwd-phone ${className ?? ""}`} style={style}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static screenshot inside a scaled canvas */}
      <img src={src} alt="" decoding="async" />
    </div>
  );
}

/** A dark frame with a phone rising from its bottom edge. */
function Stage({ src, top, width, children, style }: { src: string; top: number; width: number; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div className="fwd-img fwd-stage" style={style}>
      <Phone src={src} style={abs({ left: "50%", top, width, transform: "translateX(-50%)" })} />
      {children}
    </div>
  );
}

/** "// LABEL" over a serif headline, top left. */
function Head({ label, children, width = 1100, size }: { label: ReactNode; children: ReactNode; width?: number; size?: number }) {
  return (
    <div style={abs({ left: 96, top: 184, width, display: "flex", flexDirection: "column", gap: 36 })}>
      <div className="fwd-label rv" style={d(0)}>{label}</div>
      <h2 className="fwd-h rv" style={d(1, size ? { fontSize: size, lineHeight: size > 100 ? 0.98 : 1.02 } : undefined)}>{children}</h2>
    </div>
  );
}

/** Quiet paragraph in the top right corner, as on Filip's chapter slides. */
function Lede({ children, top = 184 }: { children: ReactNode; top?: number }) {
  return (
    <p className="fwd-lede rv" style={d(2, abs({ right: 96, top, width: 600 }))}>
      {children}
    </p>
  );
}

const Open = () => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M6 14 14 6M7.5 6H14v6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── 01 Cover ───────────────────────────────────────────────────────── */
function Cover({ t, lang }: P) {
  return (
    <>
      <div className="fwd-label rv" style={d(0, abs({ left: 96, top: 184 }))}>
        {t("// Tonik · zadanie design & build", "// Tonik · design & build task")}
      </div>
      {/* Sam telling the night to the agent; the window runs off the right edge */}
      <Shot src={shot(lang, "web-talk")} className="fwd-lift rv" style={d(2, abs({ left: 1000, top: 236, width: 1060 }))} />
      <div style={abs({ left: 96, bottom: 96, width: 860, display: "flex", flexDirection: "column" })}>
        <h1 className="fwd-serif rv" style={d(1, { fontSize: 184, lineHeight: 0.88, letterSpacing: "-.03em" })}>
          Create
          <br />
          <em>Shift</em> Report
        </h1>
        <p className="fwd-serif rv" style={d(2, { marginTop: 48, maxWidth: 840, fontSize: 46, lineHeight: 1.12, color: "rgba(var(--ink), .9)" })}>
          {t(
            "Raport ze zmiany dla managerów barów i klubów — o 3:00, po dziesięciu godzinach na nogach",
            "An end-of-shift report for bar and club managers — at 3am, after ten hours on their feet",
          )}
        </p>
        <div className="fwd-rule rv" style={d(3, { marginTop: 56, display: "flex", justifyContent: "space-between", alignItems: "center" })}>
          <span className="fwd-serif" style={{ fontSize: 40, lineHeight: 1 }}>Filip Wierzbiański</span>
          <span className="fwd-k" style={{ color: "rgba(var(--ink), .75)" }}>Senior Product Designer</span>
        </div>
      </div>
    </>
  );
}

/* ── 02 Context ─────────────────────────────────────────────────────── */
function Context({ t, lang }: P) {
  const stats = [
    { k: t("Pora", "Time"), big: "03:00", sub: t("po 10-godzinnej zmianie", "after a 10-hour shift") },
    { k: t("Cel", "Target"), big: <>&lt;10<small>min</small></>, sub: t("na typową noc", "for a typical night") },
    { k: t("Sekcje", "Sections"), big: "13", sub: t("wszystkie opcjonalne", "all optional") },
    { k: t("Incydent", "Incident"), big: "4", sub: t("czas · miejsce · typ · opis", "time · place · type · description") },
  ];
  return (
    <>
      <div style={abs({ left: 96, top: 184, width: 1160, display: "flex", flexDirection: "column", gap: 36 })}>
        <div className="fwd-label rv" style={d(0)}>{t("// Kontekst", "// Context")}</div>
        <h2 className="fwd-h rv" style={d(1)}>
          {t(<>Raport ze zmiany o&nbsp;3:00&nbsp;— <em>zanim</em> manager pójdzie do domu</>, <>A shift report at 3am, <em>before</em> the manager can&nbsp;go&nbsp;home</>)}
        </h2>
        <p className="fwd-lede rv" style={d(2, { marginTop: -8 })}>
          {t(
            "Managerowie zamykający bary i kluby kończą noc przy laptopie. Raport to ślad dowodowy lokalu: dla następnej zmiany, właściciela i ubezpieczyciela.",
            "Closing managers at bars and clubs finish the night at a laptop. The report is the venue’s evidence trail: for the next shift, the owner and the insurer.",
          )}
        </p>
        <div className="rv" style={d(3, { display: "flex", flexWrap: "wrap", gap: 16 })}>
          <span className="fwd-chip">{t("Prowadzony ↔ swobodny, bez wyboru", "Guided ↔ freeform, no forced choice")}</span>
          <span className="fwd-chip dim">{t("Dowody: zdjęcia · wideo · dokumenty", "Evidence: photos · videos · documents")}</span>
        </div>
      </div>
      {/* the report drawer: 13 optional sections, the incident's four minimum fields */}
      <Shot src={shot(lang, "web-report")} crop={[949, 106, 480, 744]} className="rv" style={d(3, abs({ right: 96, top: 184, width: 510 }))} />
      <div className="fwd-stats sm" style={{ right: 96 + 510 + 64, gap: 32 }}>
        {stats.map((s, i) => (
          <div key={i} className="fwd-stat fwd-rule rv" style={d(4 + i)}>
            <span className="fwd-k">[ 0{i + 1} ] {s.k}</span>
            <span className="fwd-big">{s.big}</span>
            <span className="fwd-sub">{s.sub}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── 03 Quick persona (src/lib/personas.ts, id "manager") ──────────────── */
function Persona({ t, lang }: P) {
  const needs = t(
    ["Zamknąć raport w kilka minut", "Nie pominąć niczego, o co zapyta ubezpieczyciel", "Przekazać porannej zmianie, co zepsute, czego brakuje i co otwarte"],
    ["Close the report in minutes", "Miss nothing an insurer will ask about", "Tell the morning team what’s broken, low and open"],
  );
  return (
    <>
      <div className="fwd-label rv" style={d(0, abs({ left: 96, top: 184 }))}>{t("// Szybka persona", "// Quick persona")}</div>
      <div style={abs({ left: 96, top: 244, width: 1200, display: "flex", flexDirection: "column" })}>
        <h2 className="fwd-h rv" style={d(1, { fontSize: 136, lineHeight: 0.9, letterSpacing: "-.03em" })}>Sam Reyes</h2>
        <span className="fwd-k rv" style={d(1, { marginTop: 28 })}>
          {t("Managerka zamykająca · 03:02, po 10-godzinnej zmianie", "Closing manager · 03:02, after a 10-hour shift")}
        </span>
        <p className="fwd-serif rv" style={d(2, { marginTop: 44, fontSize: 54, lineHeight: 1.1, fontStyle: "italic", letterSpacing: "-.01em" })}>
          {t(
            "„Do dziesięć po trzeciej chcę mieć to z głowy. Jestem śpiąca, ale muszę jeszcze szybko to ogarnąć.”",
            "“By ten past three I want this off my plate. I’m sleepy, but I still have to sort this out quickly.”",
          )}
        </p>
        <p className="fwd-p rv" style={d(3, { marginTop: 28, maxWidth: 1100 })}>
          {t(
            "Światła w pół, ekipa składa krzesła, klucze w ręce, telefon na 9%. Raz wyrzuca z siebie wszystko naraz, raz woli, żeby ją pytać.",
            "Lights half up, staff stacking chairs, keys in one hand, phone on 9%. Some nights she brain-dumps, some nights she wants to be asked.",
          )}
        </p>
      </div>
      <div className="fwd-cols" style={{ right: 104 + 384 + 80, alignItems: "flex-start", gap: 36 }}>
        {needs.map((n, i) => (
          <div key={i} className="fwd-col fwd-rule rv" style={d(4 + i, { gap: 16 })}>
            <span className="fwd-k">[ 0{i + 1} ] {t("Potrzeba", "Need")}</span>
            <p className="fwd-serif" style={{ fontSize: 34, lineHeight: 1.1 }}>{n}</p>
          </div>
        ))}
      </div>
      {/* Sam on her phone, telling the night in one go */}
      <Phone src={shot(lang, "phone-talk")} className="rv" style={d(2, abs({ right: 104, top: 190, width: 384 }))} />
    </>
  );
}

/* ── 04 Key decisions ───────────────────────────────────────────────── */
function Decisions({ t, lang }: P) {
  const badge = (n: number) => <span className="fwd-badge" style={abs({ left: 20, top: 20, zIndex: 1 })}>{n}</span>;
  const cols = [
    {
      // Mike at the door: one tap, photo or voice
      frame: <Stage src={shot(lang, "phone-mike")} top={40} width={220} style={{ position: "relative", height: 340 }}>{badge(1)}</Stage>,
      h: t("Bar i bramka też zgłaszają incydenty", "The bar and the door report incidents too"),
      p: t("Obsługa zapisuje zdarzenie w trakcie zmiany — jednym gestem, bez pisania.", "Staff capture what happened during the shift, in one gesture, no typing."),
    },
    {
      // Dana's morning view: the insurer button is hers
      frame: <Stage src={shot(lang, "phone-dana")} top={40} width={220} style={{ position: "relative", height: 340 }}>{badge(2)}</Stage>,
      h: t("System podpowiada, właściciel decyduje", "We suggest, the owner decides"),
      p: t(
        "Najważniejsze informacje sami wysyłamy reszcie zespołu, np. poranne przekazanie zmiany. Zgłoszenie do ubezpieczyciela to decyzja właściciela lokalu.",
        "We send the most important information to other staff, e.g. the morning handover. Notifying the insurer is the venue owner’s decision.",
      ),
    },
    {
      // the night's numbers from the till, the door counter and the rota, before Sam says a word
      frame: <Shot src={shot(lang, "web-night")} crop={[526, 420, 640, 400]} style={{ position: "relative", width: "100%" }}>{badge(3)}</Shot>,
      h: t("Szkic jest gotowy, zanim manager się odezwie", "The draft is mostly written before the manager speaks"),
      p: t(
        "Zakładam, że system jest połączony np. z licznikiem na bramce, kasą (POS) i grafikiem.",
        "I assume the system is connected to e.g. the door counter, the till (POS) and the rota.",
      ),
    },
  ];
  return (
    <>
      <Head label={t("// Decyzje", "// Decisions")}>
        {t(<>Najważniejsze <em>decyzje</em> z&nbsp;mojej strony</>, <>My key <em>decisions</em></>)}
      </Head>
      <div className="fwd-cols" style={{ alignItems: "flex-start" }}>
        {cols.map((c, i) => (
          <div key={i} className="fwd-col rv" style={d(2 + i, { gap: 22 })}>
            {c.frame}
            <h3 style={{ fontSize: 46 }}>{c.h}</h3>
            <p className="fwd-p" style={{ fontSize: 24, lineHeight: 1.45 }}>{c.p}</p>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── 05 Prototype launchpad ─────────────────────────────────────────── */
function Prototype({ t, lang }: P) {
  const CARD: Crop = [472, 100, 747, 760];
  const web = (name: string, i: number, who: string) => (
    <Shot src={shot(lang, name)} crop={CARD} style={{ position: "relative", width: "100%" }}>
      <span className="fwd-pill">[ 0{i} ] {who}</span>
    </Shot>
  );
  const phone = (name: string, i: number, who: string) => (
    <Stage src={shot(lang, name)} top={76} width={236} style={{ position: "relative", aspectRatio: "747 / 760" }}>
      <span className="fwd-pill">[ 0{i} ] {who}</span>
    </Stage>
  );
  const cards = [
    { href: "/manager", frame: web("web-night", 1, "Sam · 03:02"), title: t(<>Bar i bramka zgłosiły incydent</>, <>The bar and the door reported an incident</>) },
    { href: "/manager?night=solo", frame: web("web-solo-talk", 2, "Sam · 03:02"), title: t(<>Nikt nic nie zgłosił</>, <>Nobody reported anything</>) },
    { href: "/staff?role=security", frame: phone("phone-mike", 3, "Mike · 01:42"), title: t(<>Bramka zgłasza incydent <span>(Mike)</span></>, <>The door reports an incident <span>(Mike)</span></>) },
    { href: "/owner", frame: phone("phone-dana", 4, "Dana · 09:00"), title: t(<>Właścicielka czyta raport <span>(Dana)</span></>, <>The owner reads the report <span>(Dana)</span></>) },
  ];
  return (
    <>
      <Head label={t("// Prototyp", "// The prototype")}>
        {t(<>Pokażę to na <em>żywo</em></>, <>Let me show it <em>live</em></>)}
      </Head>
      <Lede>
        {t("Cztery wejścia do prototypu. Każde otwiera się w nowej karcie.", "Four ways into the prototype. Each one opens in a new tab.")}
      </Lede>
      <div className="fwd-cards">
        {cards.map((c, i) => (
          <a key={c.href} href={c.href} target="_blank" rel="noopener" className="fwd-card rv" style={d(2 + i)}>
            {c.frame}
            <h3>{c.title}</h3>
            <span className="fwd-open">
              {t("Otwórz", "Open")}
              <Open />
            </span>
          </a>
        ))}
      </div>
    </>
  );
}

/* ── 06 What if the manager doesn't file (light statement slide) ────────── */
function NoReport({ t, lang }: P) {
  return (
    <>
      <Head label={t("// A co jeśli…", "// What if…")} width={1220} size={120}>
        {t(<>A co jeśli manager <em>nie wypełni</em> raportu?</>, <>What if the manager <em>doesn’t file</em> the report?</>)}
      </Head>
      <div className="fwd-cols" style={{ right: 104 + 384 + 80, alignItems: "flex-start", gap: 40 }}>
        <div className="fwd-col fwd-rule rv" style={d(2, { gap: 28 })}>
          <span className="fwd-k">[ 01 ] {t("Zamknięcie", "Closing")}</span>
          <span className="fwd-time">03:00</span>
          <span className="fwd-time-sub">{t("Bar zamknięty. Raportu brak.", "The bar closes. No report.")}</span>
        </div>
        <div className="fwd-col fwd-rule rv" style={d(3, { gap: 28 })}>
          <span className="fwd-k">[ 02 ] {t("15 minut później", "15 minutes later")}</span>
          <span className="fwd-time">03:15</span>
          <span className="fwd-time-sub">{t("Asystent dzwoni do managera.", "The assistant phones the manager.")}</span>
        </div>
        <div className="fwd-col fwd-rule rv" style={d(4, { gap: 28, flexGrow: 1.2 })}>
          <span className="fwd-k">[ 03 ] {t("Rozmowa", "The call")}</span>
          <p className="fwd-serif" style={{ fontSize: 54, lineHeight: 1.04, fontStyle: "italic", letterSpacing: "-.01em" }}>
            {t("Krótka rozmowa uzupełnia luki w raporcie.", "A short call fills the gaps in the report.")}
          </p>
        </div>
      </div>
      {/* the safety-net call in progress */}
      <Phone src={shot(lang, "phone-call")} className="rv" style={d(3, abs({ right: 104, top: 190, width: 384 }))} />
    </>
  );
}

/* ── 07 How persistent the AI should be ─────────────────────────────── */
const TICKS = 49;
function Persistence({ t, lang }: P) {
  return (
    <>
      <div style={abs({ left: 96, top: 184, width: 984, display: "flex", flexDirection: "column", gap: 36 })}>
        <div className="fwd-label rv" style={d(0)}>{t("// Spektrum namolności AI", "// How persistent the AI should be")}</div>
        <h2 className="fwd-h rv" style={d(1)}>{t(<>Jak bardzo AI ma <em>dopytywać</em>?</>, <>How <em>persistent</em> should the AI be?</>)}</h2>
        <p className="fwd-lede rv" style={d(2, { marginTop: -8 })}>
          {t(
            "Jedni managerowie są skrupulatni i sami dokładnie wypełnią raport. Inni chcą zamknąć i biec do domu — najpewniej różni ich sumienność.",
            "Some managers are meticulous and fill the report in thoroughly themselves. Others want to close it and rush home: they likely differ in conscientiousness.",
          )}
        </p>
      </div>
      <div className="fwd-scale rv" style={d(3, { right: 1920 - 1080, top: 640 })}>
        <div className="fwd-ticks" aria-hidden="true">
          {Array.from({ length: TICKS }, (_, i) => {
            const f = i / (TICKS - 1);
            return <i key={i} style={{ height: Math.round(64 - f * 54), opacity: 0.85 - f * 0.6 }} />;
          })}
        </div>
        <div className="fwd-axis" />
        <div className="fwd-marker" style={{ "--at": "36%" } as CSSProperties}>
          <span className="tag">{t("Miara AI dla tego managera", "The AI’s measure of this manager")}</span>
          <span className="dot" />
        </div>
        <div className="fwd-end" style={{ left: 0 }}>
          <b>{t("Skrupulatny", "Meticulous")}</b>
          <span className="fwd-p">{t("→ AI pyta więcej i dokładniej", "→ the AI asks more, in more detail")}</span>
        </div>
        <div className="fwd-end" style={{ right: 0, alignItems: "flex-end", textAlign: "right" }}>
          <b>{t("Byle do domu", "Rushing home")}</b>
          <span className="fwd-p">{t("→ AI pyta mniej i luźniej", "→ the AI asks less, more loosely")}</span>
        </div>
      </div>
      {/* a recall question about tonight's incident, already in the prototype */}
      <Shot src={shot(lang, "web-recall")} crop={[486, 118, 720, 620]} className="rv" style={d(3, abs({ right: 96, top: 184, width: 660 }))} />
      <div className="fwd-rule rv" style={d(4, abs({ right: 96, top: 784, width: 660, display: "flex", flexDirection: "column", gap: 16 }))}>
        <span className="fwd-k">[ {t("Już w prototypie", "Already in the prototype")} ]</span>
        <p className="fwd-serif" style={{ fontSize: 36, lineHeight: 1.1 }}>
          {t(
            "Liczba pytań rośnie z ryzykiem: incydent tej nocy, historia incydentów lokalu.",
            "The number of questions already follows risk: an incident tonight, the venue’s incident history.",
          )}
        </p>
      </div>
    </>
  );
}

/* ── 08 How I'd run the process ─────────────────────────────────────── */
function Process({ t, lang }: P) {
  const steps = [
    { h: t("Prezentacja dla klienta", "A presentation for the client"), p: t("Czy to ten poziom szczegółowości procesu, jaki sobie wyobrażali?", "Is this the level of detail they imagined for the process?") },
    {
      h: t("Testy użyteczności", "Usability tests"),
      p: t(
        "Potrzebny do nich inny, klikalny prototyp. Podpięcie do niego modelu językowego to żaden problem.",
        "They need a different, clickable prototype. Plugging a language model into it would not be a problem.",
      ),
    },
    { h: t("Test w prawdziwym klubie", "A test in a real club or bar"), p: t("Na prawdziwej zmianie. I chętnie porozmawiam przy okazji z obsługą.", "On a real shift. And gladly talk to the staff while I’m there.") },
  ];
  // three states of the night, fanned out: the insurer record, the final check, done
  const fan: { name: string; left: number; top: number }[] = [
    { name: "web-incident", left: 1030, top: 184 },
    { name: "web-caught", left: 1110, top: 364 },
    { name: "web-done", left: 1190, top: 544 },
  ];
  return (
    <>
      <Head label={t("// Dalej", "// Next")} width={860} size={96}>
        {t(<>Jak zorganizowałbym <em>proces</em>?</>, <>How I’d run the <em>process</em></>)}
      </Head>
      <div style={abs({ left: 96, bottom: 96, width: 860, display: "flex", flexDirection: "column", gap: 24 })}>
        {steps.map((s, i) => (
          <div key={i} className="fwd-rule rv" style={d(2 + i, { display: "flex", gap: 28, alignItems: "flex-start" })}>
            <span className="fwd-serif" style={{ flex: "0 0 92px", fontSize: 72, lineHeight: 0.8, letterSpacing: "-.03em" }}>0{i + 1}</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <h3 className="fwd-serif" style={{ fontSize: 42, lineHeight: 1.02, letterSpacing: "-.01em" }}>{s.h}</h3>
              <p className="fwd-p" style={{ fontSize: 24, lineHeight: 1.45 }}>{s.p}</p>
            </div>
          </div>
        ))}
      </div>
      {fan.map((f, i) => (
        <Shot key={f.name} src={shot(lang, f.name)} className="fwd-lift rv" style={d(3 + i, abs({ left: f.left, top: f.top, width: 700 }))} />
      ))}
    </>
  );
}

/* ── 09 My process and working with AI ──────────────────────────────── */
const Dot = () => <span className="dim"> · </span>;
function MyProcess({ t }: P) {
  const steps: ReactNode[] = t(
    [
      <>Brief → plan na 8&nbsp;h z&nbsp;Claude → research: istniejące narzędzia i&nbsp;wywiad poznawczy</>,
      <>Persony, kontekst i&nbsp;flow w&nbsp;FigJam → zakres</>,
      <>Claude Design: 5 opcji „orba” AI → agent-wstążki<Dot />ciemny design system → 3 redesigny → „Studio noir”</>,
      <>Kod: Next.js, Tailwind, shadcn<Dot />Claude API ze structured output (+ scenariusz zapasowy)<Dot />głos ElevenLabs i&nbsp;rozpoznawanie mowy w&nbsp;przeglądarce<Dot />pełna wersja PL<Dot />zdjęcia z&nbsp;OpenArt</>,
    ],
    [
      <>Brief → an 8-hour plan with Claude → research: existing tools and the cognitive interview</>,
      <>Personas, context and flow in FigJam → scope</>,
      <>Claude Design: 5 options for the AI “orb” → the ribbons agent<Dot />dark design system → 3 redesigns → “Studio noir”</>,
      <>Code: Next.js, Tailwind, shadcn<Dot />Claude API with structured output (+ scripted fallback)<Dot />ElevenLabs voice and in-browser speech recognition<Dot />full Polish version<Dot />photos from OpenArt</>,
    ],
  );
  return (
    <>
      <Head label={t("// Proces × AI", "// Process × AI")} width={1600} size={72}>
        {t(<>Mój proces i&nbsp;współpraca z&nbsp;<em>AI</em></>, <>My process and working with <em>AI</em></>)}
      </Head>
      <div className="fwd-two">
        <div className="fwd-stack">
          <span className="fwd-head rv" style={d(2)}>[ {t("Proces", "Process")} ]</span>
          {steps.map((s, i) => (
            <div key={i} className="fwd-row rv" style={d(3 + i)}>
              <span className="fwd-k">0{i + 1}</span>
              <p>{s}</p>
            </div>
          ))}
        </div>
        <div className="fwd-stack">
          <span className="fwd-head rv" style={d(3)}>[ {t("AI × człowiek", "AI × human")} ]</span>
          <div className="fwd-row rv" style={d(4, { alignItems: "center", gap: 32 })}>
            <span className="fwd-serif" style={{ fontSize: 150, lineHeight: 0.8, letterSpacing: "-.03em" }}>18</span>
            <p style={{ color: "rgba(var(--ink), .62)" }}>
              {t(
                "rund recenzji: zewnętrzny agent oceniał każdą względem briefu, wizualiów i person",
                "review rounds: an external agent scored each one against the brief, the visuals and the personas",
              )}
            </p>
          </div>
          <div className="fwd-row col rv" style={d(5)}>
            <span className="fwd-k">{t("Moje recenzje robiły duże zwroty", "My own reviews made the big turns")}</span>
            <p>
              {t(
                <>Rozmowa w&nbsp;centrum<Dot />prawdziwy layout webowy na laptop<Dot />ścieżka „nikt nic nie zgłosił”<Dot />zdjęcia jako dowody<Dot />wersja polska</>,
                <>Conversation at the centre<Dot />a real web layout for the laptop<Dot />the “nobody reported anything” path<Dot />photo evidence<Dot />a Polish version</>,
              )}
            </p>
          </div>
          <div className="fwd-row col rv" style={d(6)}>
            <span className="fwd-k">{t("Gdzie potrzebny był człowiek", "Where the human mattered")}</span>
            <p style={{ fontStyle: "italic" }}>
              {t(
                "AI kopiowało to, co dostało: zwiniętej sekcji briefu nie zauważyło, dopóki jej nie wyłapałem. Decyzje, gust i cięcia zostały po ludzkiej stronie.",
                "AI copied what it was given: it missed a collapsed section of the brief until I caught it. Decisions, taste and cuts stayed human.",
              )}
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export const SLIDES: SlideDef[] = [
  { id: "cover", chapter: null, Body: Cover },
  { id: "context", chapter: 0, Body: Context },
  { id: "persona", chapter: 0, Body: Persona },
  { id: "decisions", chapter: 1, Body: Decisions },
  { id: "prototype", chapter: 1, Body: Prototype },
  { id: "no-report", chapter: 1, light: true, Body: NoReport },
  { id: "persistence", chapter: 1, Body: Persistence },
  { id: "process", chapter: 2, Body: Process },
  { id: "my-process", chapter: 2, Body: MyProcess },
];
