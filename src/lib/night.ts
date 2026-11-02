// The demo night at The Copper Room. In a real product the numbers come from POS,
// door counter and rota integrations, and the captures from staff phones.

export const venue = {
  name: "The Copper Room",
  date: "Sat 31 Oct",
  closedAt: "03:00",
  incidentsLast30Days: 4,
};

export const people = {
  manager: { name: "Sam Reyes", short: "Sam", initials: "SR" },
  security: { name: "Mike Adeyemi", short: "Mike", initials: "MA" },
  bar: { name: "Ola Nowak", short: "Ola", initials: "ON" },
  opener: { name: "Tom Baker", short: "Tom", initials: "TB" },
  owner: { name: "Dana Kerr", short: "Dana", initials: "DK" },
};

export type Stat = { label: string; source: string; value: string; note: string; flag?: boolean };

export const stats: Stat[] = [
  { label: "Revenue", source: "POS", value: "£14,820", note: "▲ 8% vs avg Sat" },
  { label: "Door", source: "Counter", value: "612", note: "peak 380 at 01:10" },
  { label: "Staff", source: "Rota", value: "14", note: "DJ in 50 min late" },
  { label: "Till 2", source: "POS", value: "▼ £45", note: "short at cash-up", flag: true },
];

// People inside per half hour, 20:00 → 02:30, from the door counter.
export const timeline: { t: string; n: number; mark?: "anomaly" | "incident" | "peak" }[] = [
  { t: "20:00", n: 30 }, { t: "20:30", n: 70 }, { t: "21:00", n: 120 }, { t: "21:30", n: 160 },
  { t: "22:00", n: 210 }, { t: "22:30", n: 250 }, { t: "23:00", n: 290 }, { t: "23:30", n: 320, mark: "anomaly" },
  { t: "00:00", n: 350 }, { t: "00:30", n: 365 }, { t: "01:00", n: 380, mark: "peak" }, { t: "01:30", n: 360, mark: "incident" },
  { t: "02:00", n: 290 }, { t: "02:30", n: 160 },
];

export type Capture = {
  id: string;
  by: keyof typeof people;
  time: string;
  kind: "photo" | "voice" | "note";
  tag: string;
  text: string;
  urgent?: boolean;
};

// Sent by staff during the shift with one gesture (see /staff).
export const captures: Capture[] = [
  { id: "c0", by: "bar", time: "22:05", kind: "note", tag: "Repairs", text: "Ice machine slow, topped up from the cellar" },
  { id: "c4", by: "security", time: "23:15", kind: "note", tag: "Refused entry", text: "Refused 2 guests, too drunk" },
  { id: "c1", by: "bar", time: "00:31", kind: "voice", tag: "Stock", text: "IPA keg kicked, switched tap 4 to lager. No spare in the cellar" },
  { id: "c2", by: "security", time: "01:42", kind: "photo", tag: "Fight", text: "Fight at bar end, glass broken. Injured guest: Liam Hart · camera 3", urgent: true },
  { id: "c3", by: "security", time: "02:04", kind: "voice", tag: "Fight", text: "“Police not called. He left with his mates around two.”", urgent: true },
];

export const incidentHistory = { total: 4, fightsAtBarEnd: 3, days: 30 };

export const demoStory =
  "Busy one, good night overall. DJ turned up almost an hour late so we ran the playlist till midnight. " +
  "Around twenty to two two lads started fighting at the end of the bar, Mike split them up, one of them cut his hand on a broken glass. " +
  "Jess did first aid and patched him up. Till two was down forty five quid at cash up. IPA ran out around half twelve.";

// The report's sections, as the brief lists them. All optional for the manager;
// "words" light a section up while she talks (English and Polish stems).
export type CategoryId =
  | "general" | "incidents" | "audience" | "security" | "artists" | "door" | "production"
  | "bar" | "kitchen" | "vendors" | "private" | "maintenance" | "inventory";

export const categories: { id: CategoryId; label: string; short: string; words: string[] }[] = [
  { id: "general", label: "General overview", short: "Overview", words: ["busy one", "good night", "overall", "quiet one", "revenue", "pełno ludzi", "dobra noc", "spokojn", "w sumie"] },
  { id: "incidents", label: "Incidents", short: "Incidents", words: ["fight", "scuffle", "cut his", "injur", "ambulance", "ejected", "first aid", "assault", "blood", "bójk", "szamotanin", "przepychank", "skaleczy", "rozciął", "ranny", "karetk", "wyprosi", "pierwszej pomocy"] },
  { id: "audience", label: "Audience · experience, safety & concerns", short: "Audience", words: ["complain", "noise", "neighbour", "queue", "lost property", "crowd", "vip", "skarg", "hałas", "sąsiad", "kolejk", "zgub", "tłum"] },
  { id: "security", label: "Security overview", short: "Security", words: ["mike", "security", "police", "cctv", "camera", "split them", "ochron", "policj", "kamer", "rozdzieli"] },
  { id: "artists", label: "Artist & crew experience", short: "Artists & crew", words: ["dj", "artist", "band", "promoter", "playlist", "didżej", "artyst", "playlist"] },
  { id: "door", label: "Door staff review", short: "Door staff", words: ["the door", "refused", "fake id", "kuba", "bouncer", "bramk", "bramce", "nie wpuści", "odmówi"] },
  { id: "production", label: "Production · run of show · doors", short: "Run of show", words: ["sound", "lights", "stage", "set time", "run of show", "doors open", "nagłośn", "scen", "oświetl"] },
  { id: "bar", label: "Bar staff review", short: "Bar staff", words: ["till two", "till 2", "cash up", "cash-up", "quid", "variance", "float", "bar staff", "kasie", "kasa", "złot", "utarg", "barman"] },
  { id: "kitchen", label: "Kitchen", short: "Kitchen", words: ["kitchen", "food", "chef", "kuchni", "jedzeni"] },
  { id: "vendors", label: "Third-party vendors", short: "Vendors", words: ["supplier", "delivery", "vendor", "cloakroom", "dostaw", "szatni"] },
  { id: "private", label: "Private events", short: "Private events", words: ["private", "booking", "birthday", "rezerwac", "urodzin", "prywatn"] },
  { id: "maintenance", label: "Maintenance & equipment", short: "Maintenance", words: ["leak", "ice machine", "toilet", "fridge", "glass washer", "repair", "blocked", "usterk", "zepsu", "toalet", "toalec", "kostkark", "zapchan", "nie działa", "suszark", "dryer"] },
  { id: "inventory", label: "Inventory notes", short: "Inventory", words: ["keg", "ran out", "stock", "ipa", "lager", "beczk", "skończył", "zapas"] },
];

// Small helper questions per section: greyed hints for a manager who doesn't know what to say next.
export const sectionPrompts: Record<CategoryId, string> = {
  general: "How was the night overall?",
  incidents: "Were there any incidents?",
  audience: "Tell me about the guests tonight",
  security: "How did the night look from the door?",
  artists: "Did the DJ and artists play as planned?",
  door: "How did the door team do? Any refusals?",
  production: "Did sound, lights and timings go to plan?",
  bar: "How did the bar team do? Anything on the tills?",
  kitchen: "Anything from the kitchen?",
  vendors: "Any trouble with deliveries or other vendors?",
  private: "Were there private bookings? How did they go?",
  maintenance: "Anything broken or not working?",
  inventory: "Did anything run out or run low?",
};

// The order hints are offered in: what an insurer and the morning team need most first.
export const promptOrder: CategoryId[] = ["security", "incidents", "audience", "bar", "inventory", "maintenance", "artists", "door", "general", "production", "private", "vendors", "kitchen"];

export function coveredBy(text: string): Set<CategoryId> {
  const t = text.toLowerCase();
  return new Set(categories.filter((c) => c.words.some((w) => t.includes(w))).map((c) => c.id));
}

// ---------------------------------------------------------------------------
// What the AI "caught" from the story + captures + data. Same shape the real
// Claude call returns (see src/lib/schema.ts).

export type Fact = {
  id: string;
  category: CategoryId;
  title: string;
  detail: string;
  source: { who: string; quote: string };
  incident?: boolean;
  carryOver?: string; // becomes an open item for the next shift
  owner?: string; // who the open item belongs to (default: the opener)
  alternatives?: string[]; // other fixes Sam can pick instead of the AI's suggestion
};

// Drafted from the systems before Sam says a word (both nights).
export const overviewFact: Fact = {
  id: "g1",
  category: "general",
  title: "Busy Saturday: £14,820, 612 guests",
  detail: "8% above an average Saturday · peak 380 at 01:10",
  source: { who: "POS + door counter", quote: "£14,820 · 612 through the door" },
};

// A fact as the manager sees it while reviewing.
export type FactRow = Fact & {
  status: "pending" | "confirmed" | "rejected";
  fromAnswer?: boolean;
  edited?: boolean;
  was?: string; // the AI's title before Sam corrected it
  carryWas?: string; // the AI's next-shift suggestion before Sam picked another fix
};

export const caughtFacts: Fact[] = [
  overviewFact,
  {
    id: "f1",
    category: "incidents",
    incident: true,
    title: "Fight at bar end, guest cut hand on glass",
    detail: "01:40 · first aid by Jess · police not called",
    source: { who: "You + Mike's photo 01:42", quote: "one of them cut his hand on a broken glass" },
  },
  {
    id: "f2",
    category: "bar",
    title: "Till 2 short £45 at cash-up",
    detail: "Bar till 2 · cause unknown",
    source: { who: "You + POS", quote: "Till two was down forty five quid" },
    carryOver: "Recount till 2 float before open",
    alternatives: ["Check till 2 on camera before recounting", "Ask the bar team about till 2 first"],
  },
  {
    id: "f3",
    category: "inventory",
    title: "IPA keg ran out ~00:30",
    detail: "Tap 4 switched to lager",
    source: { who: "Ola 00:31", quote: "IPA keg kicked, switched tap 4 to lager. No spare in the cellar" },
    carryOver: "Order IPA keg (no spare in cellar)",
    alternatives: ["Borrow a keg from Foundry Bar for Sunday", "Keep tap 4 on lager until Tuesday's delivery"],
  },
  {
    id: "f4",
    category: "artists",
    title: "DJ arrived 50 min late",
    detail: "Playlist ran until midnight",
    source: { who: "You + rota", quote: "DJ turned up almost an hour late" },
    carryOver: "Raise DJ lateness with promoter",
    alternatives: ["Book a backup DJ for next Saturday", "Just a word with the DJ, first time"],
  },
  {
    id: "f5",
    category: "security",
    title: "Door team: 1 fight handled, police not called",
    detail: "Mike and Kuba on the door all night",
    source: { who: "Mike 01:42, 02:04 + rota", quote: "Police not called. He left with his mates around two." },
  },
  {
    id: "f6",
    category: "door",
    title: "2 guests refused entry, too drunk",
    detail: "Door · 23:15",
    source: { who: "Mike 23:15", quote: "Refused 2 guests, too drunk" },
  },
  {
    id: "f7",
    category: "maintenance",
    title: "Ice machine slow",
    detail: "Topped up from the cellar",
    source: { who: "Ola 22:05", quote: "Ice machine slow, topped up from the cellar" },
    carryOver: "Get the ice machine checked",
    alternatives: ["Call the engineer today", "Buy bagged ice for Sunday"],
  },
];

export const missingAfterStory: CategoryId[] = [];

// ---------------------------------------------------------------------------
// Recall questions (cognitive interview). Built from data + gaps, never invented.

export type RecallQuestion = {
  id: string;
  technique: "Anomaly" | "Context" | "Perspective" | "Gap" | "Reverse order";
  short: string;
  from: string; // shown under the question: which system it comes from
  why: string; // notes under the prototype: why it's worth asking
  chipsFrom: string; // notes under the prototype: where the answer chips come from
  category: CategoryId; // where a typed answer goes if its words don't say otherwise
  source: string;
  fact: string;
  text: string;
  answers: { label: string; adds?: Omit<Fact, "id" | "source"> }[];
  guidedOnly?: boolean;
};

export const recallQuestions: RecallQuestion[] = [
  {
    id: "q1",
    technique: "Anomaly",
    short: "23:40 cancellations",
    from: "From the till system",
    why: "6 cancellations in 10 minutes is unusual for a Saturday on this till. Cancellations shortly before a cash shortfall are the classic pattern behind a short till, so it's worth one question while Sam still remembers.",
    chipsFrom: "The usual innocent cause of a burst of cancellations, plus a private route: nobody should be accused at 3am, so the bar team is asked one to one, not in a group chat.",
    category: "bar",
    source: "POS · till 2",
    fact: "23:40 · 6 items cancelled",
    text: "Till 2 cancelled 6 items in 10 minutes around 23:40. Do you know why?",
    answers: [
      { label: "Wrong round, remade it", adds: { category: "bar", title: "23:40 cancellations on till 2: wrong round remade", detail: "Explains the cancellations. The £45 short is a separate question" } },
      { label: "Ask the bar team privately", adds: { category: "bar", title: "Bar team asked about the 23:40 cancellations", detail: "Answer comes to you before 11:00", carryOver: "Till 2: 23:40 cancellations being checked", owner: "Sam" } },
      { label: "Not sure", adds: { category: "bar", title: "23:40 cancellations on till 2 unexplained", detail: "Flagged for the weekly till review" } },
    ],
  },
  {
    id: "q2",
    technique: "Context",
    short: "01:10 peak",
    from: "From the door counter",
    why: "The context technique from the cognitive interview: putting Sam back in the fullest moment of the night (the door counter's peak) brings back details a general question misses.",
    chipsFrom: "The three things most often logged at peak on Saturdays at this venue over the last 12 weeks: refused entry (9 times), queue complaints (5), blocked toilets (4). In the product they come from the venue's past reports, so every venue gets its own.",
    category: "audience",
    source: "Door counter",
    fact: "01:10 · peak, 380 inside",
    text: "Picture 1:10, the room at its fullest. Door, toilets, dance floor. Anything you haven’t told me?",
    answers: [
      { label: "Toilets blocked", adds: { category: "maintenance", title: "Gents toilet blocked at peak", detail: "~01:10", carryOver: "Call plumber about gents" } },
      { label: "Queue complaint at the door", adds: { category: "audience", title: "Queue complaint at the door", detail: "~01:10" } },
      { label: "Someone refused entry", adds: { category: "door", title: "Guest refused entry at peak", detail: "Door staff decision" } },
    ],
  },
  {
    id: "q3",
    technique: "Perspective",
    short: "Kuba sent nothing",
    from: "From the rota",
    why: "The change-of-perspective technique: the rota shows Kuba worked the door all night but sent nothing. Imagining his view brings back what happened out front.",
    chipsFrom: "What door staff at this venue report most often: refusals, a confiscated ID, or a quiet night.",
    category: "door",
    source: "Rota · door",
    fact: "Kuba on the door · sent nothing tonight",
    text: "Kuba was on the door all night and didn’t send anything. What would he say happened out front?",
    answers: [
      { label: "He refused a few at the door", adds: { category: "door", title: "Guests refused entry by Kuba", detail: "Door, through the night" } },
      { label: "Fake ID confiscated", adds: { category: "door", title: "Fake ID confiscated at the door", detail: "Kuba", carryOver: "Hand fake ID to police liaison" } },
      { label: "Quiet out front" },
    ],
  },
  {
    id: "q4",
    technique: "Reverse order",
    short: "the close",
    from: "From the close",
    why: "The reverse-order technique: going backwards from lights up breaks the 'it was fine' summary and catches things at close.",
    chipsFrom: "What usually happens at close at this venue: noise outside, lost property, or nothing.",
    category: "audience",
    source: "Close · 03:00",
    fact: "Lights up 02:45 · 160 still in",
    text: "Going backwards from lights up: anything at close, on the way out or outside?",
    guidedOnly: true,
    answers: [
      { label: "Noise outside, neighbours", adds: { category: "audience", title: "Noise outside at close", detail: "Neighbour risk", carryOver: "Brief door team on dispersal" } },
      { label: "Lost property handed in", adds: { category: "audience", title: "Lost property handed in", detail: "In office safe" } },
      { label: "Smooth close" },
    ],
  },
];

// Risk-adaptive depth (Filip's FigJam note: the more incidents, the more "persistent" the bot).
// Quiet night: 1 question after a brain-dump, 2 when guided. Each risk signal adds one.
export function questionCount(opts: { path: "talk" | "guided"; incidentTonight: boolean }) {
  const base = opts.path === "guided" ? 2 : 1;
  const risk = (opts.incidentTonight ? 1 : 0) + (venue.incidentsLast30Days >= 3 ? 1 : 0);
  return Math.min(opts.path === "guided" ? 4 : 3, base + risk);
}

export function pickQuestions(opts: { path: "talk" | "guided"; incidentTonight: boolean }) {
  return recallQuestions.filter((q) => opts.path === "guided" || !q.guidedOnly).slice(0, questionCount(opts));
}

// ---------------------------------------------------------------------------
// Incident: insurer fields. value=null → visible [gap] the manager must close or mark unknown.

export type IncidentField = {
  id: string;
  label: string;
  value: string | null;
  source?: string;
  options?: string[];
  placeholder?: string;
  said?: string; // scripted voice answer when the manager taps "Say it"
  ask?: string; // how the agent asks for this gap in the conversation
};

// How each source is named in the insurer's record: third person, role + name + time.
export const insurerSource: Record<string, string> = {
  "You · Mike's photo at 01:42": "duty manager S. Reyes; photo by door supervisor M. Adeyemi, 01:42",
  "You · Mike": "duty manager S. Reyes; door supervisor M. Adeyemi",
  "Your voice note": "duty manager S. Reyes, voice note 03:05",
  "Your voice note · rota": "duty manager S. Reyes, voice note 03:05 (first name); full name from the rota",
  "Mike's voice note 02:04": "door supervisor M. Adeyemi, voice note 02:04",
  "Mike's report 01:42": "door supervisor M. Adeyemi, report 01:42",
};

export const incidentFields: IncidentField[] = [
  { id: "when", label: "When", value: "Sun 1 Nov 2026, 01:40 (Saturday night trading)", source: "You · Mike's photo at 01:42" },
  { id: "where", label: "Where", value: "Main bar, far end by the glass station", source: "You · Mike" },
  { id: "type", label: "Type", value: "Fight between guests, one injured", source: "Mike's report 01:42" },
  { id: "what", label: "What happened", value: "Two male guests fought at the bar. Door staff separated them. One guest cut his hand on a broken glass.", source: "Your voice note" },
  { id: "injured", label: "Injured person", value: "Liam Hart, guest", source: "Mike's report 01:42" },
  { id: "other", label: "Other guest", value: null, placeholder: "The second guest: ejected? identified?", options: ["Ejected, not identified", "Ejected, name in Mike's log", "Stayed, no further trouble"], said: "Mike put him out the front, didn't get a name", ask: "About the fight at 01:40. What happened to the second guest?" },
  { id: "injury", label: "Injury", value: null, placeholder: "Which hand, how deep?", options: ["Small cut, right hand", "Small cut, left hand", "Deep cut, needed hospital"], said: "Cut on his right palm, not deep, Jess taped it", ask: "The guest who cut his hand: which hand, and how deep was it?" },
  { id: "firstaid", label: "First aid", value: "Given by Jess Moreau (first aider), wound dressed", source: "Your voice note · rota" },
  { id: "ambulance", label: "Ambulance", value: null, options: ["Not needed", "Offered, refused", "Called"], said: "We offered one, he said no", ask: "Was an ambulance offered or called?" },
  { id: "police", label: "Police", value: "Not called", source: "Mike's voice note 02:04" },
  { id: "cctv", label: "CCTV", value: null, placeholder: "Mike says camera 3. Is the clip saved?", options: ["Camera 3, saved", "Camera 3, not saved yet"], said: "Camera 3, I'll export it in the morning", ask: "Mike says camera 3 covers the bar end. Is the clip saved?" },
  { id: "witnesses", label: "Witnesses", value: "Mike Adeyemi (door supervisor)", source: "Mike's report 01:42" },
  { id: "left", label: "Outcome", value: "Guest left with friends around 02:00", source: "Mike's voice note 02:04" },
];

// ---------------------------------------------------------------------------
// Outputs read by the other personas.

export const handover = {
  from: "Sam",
  to: "Tom",
  top: [
    "Order an IPA keg before open. Ola: no spare in the cellar; tap 4 is on lager.",
    "Recount till 2 float. It was £45 short at cash-up.",
    "Glass station at the bar end: check for leftover shards before the floor is mopped.",
  ],
  // The AI suggestion each top line came from, so a fix Sam changed replaces it.
  topFrom: ["Order IPA keg (no spare in cellar)", "Recount till 2 float before open", ""],
  open: [
    { text: "Raise DJ lateness with promoter", owner: "Dana", due: "this week" },
    { text: "Get the ice machine checked", owner: "Tom", due: "this week" },
    { text: "Export the camera 3 clip of the 01:40 fight", owner: "Mike", due: "Sun shift" },
  ],
  quiet: ["Revenue £14,820, 8% above an average Saturday", "612 through the door, peak 380 at 01:10", "14 staff on, no sickness"],
};

export const digest = {
  venues: [
    { name: "The Copper Room", revenue: "£14,820", delta: "▲ 8%", incidents: 1, variance: "▼ £45", status: "Filed 03:09" },
    { name: "Foundry Bar", revenue: "£6,240", delta: "▼ 3%", incidents: 0, variance: "£0", status: "Filed 02:31" },
    { name: "Lowlight", revenue: "£9,980", delta: "▲ 2%", incidents: 0, variance: "▲ £12", status: "Filed by phone call 03:24" },
  ],
  pattern: "3rd fight at the Copper Room bar end in 30 days (4 incidents in total). All between 01:30 and 02:00 on Saturdays.",
};

export const auditTrail = [
  { t: "01:42", text: "One-tap report from door supervisor M. Adeyemi: photo, injured guest's name, camera 3" },
  { t: "02:04", text: "Voice note from M. Adeyemi, transcribed (14 s): police not called, guest left around 02:00" },
  { t: "03:05", text: "Voice note from duty manager S. Reyes, transcribed (58 s)" },
  { t: "03:06", text: "AI draft created from 4 sources (manager's voice note, door supervisor's report and voice note, rota). 4 fields left as gaps; nothing filled without a named source" },
  { t: "03:08", text: "Duty manager S. Reyes filled 3 gaps and marked 1 (CCTV saved?) as not known" },
  { t: "03:09", text: "Duty manager S. Reyes reviewed the record and confirmed it as a whole" },
];

// ---------------------------------------------------------------------------
// Second path: a night with NO staff reports. The draft only has POS, door and rota,
// so everything else has to come from Sam: told in her own words, or asked for.

export type Scenario = "team" | "solo";

export const soloStory =
  "Pretty quiet one really. Around twenty to two there was a bit of a scuffle at the end of the bar, one lad cut his hand on a glass and Jess patched him up. " +
  "Till two was forty five down at cash up.";

// What the AI can claim from Sam's story + systems only. No staff sources anywhere.
export const soloFacts: Fact[] = [
  { ...overviewFact, title: "Steady Saturday: £14,820, 612 guests" },
  {
    id: "s1",
    category: "incidents",
    incident: true,
    title: "Scuffle at bar end, guest cut hand on glass",
    detail: "~01:40 · first aid by Jess · no staff report",
    source: { who: "You", quote: "one lad cut his hand on a glass and Jess patched him up" },
  },
  {
    id: "s2",
    category: "bar",
    title: "Till 2 short £45 at cash-up",
    detail: "Bar till 2 · cause unknown",
    source: { who: "You + POS", quote: "Till two was forty five down" },
    carryOver: "Recount till 2 float before open",
    alternatives: ["Check till 2 on camera before recounting", "Ask the bar team about till 2 first"],
  },
  {
    id: "s3",
    category: "artists",
    title: "DJ arrived 50 min late",
    detail: "Clocked in 23:50, scheduled 23:00",
    source: { who: "Rota", quote: "DJ clocked in 23:50, scheduled 23:00" },
    carryOver: "Raise DJ lateness with promoter",
    alternatives: ["Book a backup DJ for next Saturday", "Just a word with the DJ, first time"],
  },
];

// Guided with no story: only what the systems know.
export const soloDataFacts: Fact[] = [
  soloFacts[0],
  { ...soloFacts[2], source: { who: "POS", quote: "Till 2 variance −£45 at cash-up" } },
  soloFacts[3],
];

const troubleQuestion: RecallQuestion = {
  id: "s-q0",
  technique: "Gap",
  short: "trouble on the floor",
  from: "No reports from your team",
  why: "Nobody on the team reported anything, so the agent can't know whether the night was calm. It asks directly about the one thing the insurer needs: trouble on the floor.",
  chipsFrom: "The three answers that decide whether an incident record is needed: nothing, a fight, an injury.",
  category: "incidents",
  source: "Team reports",
  fact: "0 reports from staff tonight",
  text: "Nobody on the team flagged anything tonight. Any trouble on the floor: a fight, an injury, someone thrown out?",
  answers: [
    { label: "No, it was calm", adds: { category: "incidents", title: "No incidents tonight", detail: "Confirmed by you, no staff reports" } },
    { label: "A fight at the bar", adds: { category: "incidents", incident: true, title: "Fight at the bar, reported by you", detail: "Details to add for the insurer" } },
    { label: "Someone got hurt", adds: { category: "incidents", incident: true, title: "Guest injured, reported by you", detail: "Details to add for the insurer" } },
  ],
};

const ipaQuestion: RecallQuestion = {
  id: "s-q2",
  technique: "Anomaly",
  short: "IPA sales stop at 00:30",
  from: "From the till system",
  why: "IPA sales stop dead at 00:30 on a busy night and nobody mentioned stock. The till shows the anomaly; only Sam knows the reason.",
  chipsFrom: "The three explanations for one tap going quiet: the keg ran out, it was switched off, or Sam doesn't know (then it's checked before open).",
  category: "inventory",
  source: "POS · tap 4",
  fact: "00:30 · IPA sales stop",
  text: "IPA sales stop dead at 00:30 on a busy night. Did the keg run out?",
  answers: [
    { label: "Yes, keg kicked", adds: { category: "inventory", title: "IPA keg ran out ~00:30", detail: "From your answer", carryOver: "Order IPA keg before open" } },
    { label: "Switched it off on purpose", adds: { category: "inventory", title: "IPA tap switched off at 00:30", detail: "On purpose" } },
    { label: "Not sure", adds: { category: "inventory", title: "IPA stopped selling at 00:30", detail: "Check the cellar", carryOver: "Check IPA keg level before open" } },
  ],
};

const doorQuestion: RecallQuestion = {
  id: "s-q3",
  technique: "Perspective",
  short: "the door sent nothing",
  from: "From the rota",
  why: "The change-of-perspective technique: the rota shows two door staff on all night with no reports, which is unusual for a Saturday.",
  chipsFrom: "What door staff at this venue report most often: refusals, an ejection, or a quiet night.",
  category: "door",
  source: "Rota · door",
  fact: "Mike, Kuba on the door · 0 reports",
  text: "Mike and Kuba were on the door all night and sent nothing. What would they say happened out front?",
  answers: [
    { label: "Refused a few at the door", adds: { category: "door", title: "Guests refused entry at the door", detail: "Through the night" } },
    { label: "They threw someone out", adds: { category: "security", title: "Guest ejected by door staff", detail: "Time and reason to confirm with Mike", carryOver: "Ask Mike to log tonight's ejection" } },
    { label: "Quiet out front" },
  ],
};

export function soloQuestions(path: "talk" | "guided"): RecallQuestion[] {
  const [anomaly] = recallQuestions;
  return path === "guided" ? [troubleQuestion, anomaly, ipaQuestion, doorQuestion] : [anomaly, ipaQuestion, doorQuestion];
}

// Without Mike's reports the insurer record has many more honest gaps.
export const soloIncidentFields: IncidentField[] = [
  { id: "when", label: "When", value: "Sun 1 Nov 2026, ~01:40 (Saturday night trading)", source: "Your words" },
  { id: "where", label: "Where", value: "Main bar, far end", source: "Your words" },
  { id: "type", label: "Type", value: "Scuffle between guests, one injured", source: "Your words" },
  { id: "what", label: "What happened", value: "Two guests scuffled at the bar. One cut his hand on a broken glass.", source: "Your words" },
  { id: "injured", label: "Injured person", value: null, placeholder: "Nobody logged a name. Do you know it?", options: ["Ask the door team tomorrow"], said: "His name's Liam, regular, don't know his surname", ask: "Do you know the injured guest’s name?" },
  { id: "other", label: "Other guest", value: null, placeholder: "The second guest: ejected? identified?", options: ["Ejected, not identified", "Stayed, no further trouble"], said: "Door put him out, no name", ask: "About the scuffle at 01:40. What happened to the other guest?" },
  { id: "injury", label: "Injury", value: null, placeholder: "Which hand, how deep?", options: ["Small cut, right hand", "Small cut, left hand", "Deep cut, needed hospital"], said: "Cut on his right palm, not deep", ask: "The guest who cut his hand: which hand, and how deep was it?" },
  { id: "firstaid", label: "First aid", value: "Given by Jess Moreau (first aider)", source: "Your words · rota" },
  { id: "ambulance", label: "Ambulance", value: null, options: ["Not needed", "Offered, refused", "Called"], said: "We offered one, he said no", ask: "Was an ambulance offered or called?" },
  { id: "police", label: "Police", value: null, options: ["Not called", "Called"], said: "No, nobody called them", ask: "Were the police called?" },
  { id: "cctv", label: "CCTV", value: null, placeholder: "Which camera covers the bar end?", options: ["Camera 3, saved", "Camera 3, not saved yet"], said: "Camera 3 covers it, not saved yet", ask: "Which camera covers the bar end, and is the clip saved?" },
  { id: "witnesses", label: "Witnesses", value: null, placeholder: "Who saw it?", options: ["Door team (names on the rota)", "Bar staff on till 2"], said: "Kuba saw it from the door, and Ola behind the bar", ask: "Did anyone see it happen?" },
];

// ---------------------------------------------------------------------------
// Attachments: tonight's camera roll (filtered to the shift, 18:00–03:00) and files.
// "reading" is what the AI sees in it; it files the attachment under that section.

export type Attachment = {
  id: string;
  kind: "photo" | "video" | "document";
  src?: string;
  time: string;
  name?: string;
  length?: string;
  reading: string;
  category: CategoryId;
};

export const cameraRoll: Attachment[] = [
  { id: "p-glass", kind: "photo", src: "/photos/glass.jpg", time: "01:41", reading: "Broken glass at the bar end", category: "incidents" },
  { id: "p-till", kind: "photo", src: "/photos/till.jpg", time: "02:58", reading: "Till 2 drawer at cash-up", category: "bar" },
  { id: "p-keg", kind: "photo", src: "/photos/keg.jpg", time: "00:34", reading: "Empty IPA keg in the cellar", category: "inventory" },
  { id: "v-dj", kind: "video", src: "/photos/dj.jpg", time: "23:05", length: "0:09", reading: "DJ booth still empty at 23:05", category: "artists" },
  { id: "p-queue", kind: "photo", src: "/photos/queue.jpg", time: "23:18", reading: "Queue at the door", category: "audience" },
  { id: "p-ice", kind: "photo", src: "/photos/ice.jpg", time: "22:07", reading: "Ice machine nearly empty", category: "maintenance" },
];

export const files: Attachment[] = [
  { id: "d-z", kind: "document", time: "02:58", name: "Till 2 Z-report.pdf", reading: "Till 2 end-of-day report", category: "bar" },
  { id: "d-delivery", kind: "document", time: "17:40", name: "Brewery delivery note.pdf", reading: "Saturday delivery, 1 keg short", category: "vendors" },
  { id: "d-booking", kind: "document", time: "Fri", name: "Booth 2 booking, Mia's 30th.pdf", reading: "Private booking: booth 2, 20 guests", category: "private" },
];

export const allAttachments = [...cameraRoll, ...files];

// The order the agent asks about incident gaps in conversation (most important to an insurer first).
// At most four are asked; the rest stay open in the record, honestly marked.
export const gapPriority = ["injury", "other", "ambulance", "police", "cctv", "injured", "witnesses"];
export const MAX_GAP_QUESTIONS = 4;
