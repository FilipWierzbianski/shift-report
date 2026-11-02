export type PersonaId = "manager" | "security" | "bar" | "opener" | "owner" | "insurer";

export type Persona = {
  id: PersonaId;
  name: string;
  initials: string;
  role: string;
  when: string;
  quote: string;
  needs: string[];
  context: string;
  href: string;
  view: string;
};

export const personas: Persona[] = [
  {
    id: "manager",
    name: "Sam Reyes",
    initials: "SR",
    role: "Closing manager",
    when: "03:02, after a 10-hour shift",
    quote: "By ten past three I want this off my plate. I’m sleepy, but I still have to sort this out quickly.",
    needs: ["Close the report in minutes", "Miss nothing an insurer will ask about", "Tell the morning team what's broken, low and open"],
    context: "Lights half up, staff stacking chairs, keys in one hand, phone on 9%. Some nights she brain-dumps, some nights she wants to be asked.",
    href: "/manager",
    view: "Closes the night",
  },
  {
    id: "security",
    name: "Mike Adeyemi",
    initials: "MA",
    role: "Door supervisor",
    when: "01:42, mid-incident",
    quote: "I know the lad's name and which camera caught it. Nobody asks me.",
    needs: ["Report in 10 seconds, gloves on, radio in hand", "A photo or a few words, no typing", "Know the manager has it"],
    context: "Holds the facts insurers need: names, ejections, CCTV. Has a paper door log nobody reads.",
    href: "/staff?role=security",
    view: "Reports in one gesture",
  },
  {
    id: "bar",
    name: "Ola Nowak",
    initials: "ON",
    role: "Bartender",
    when: "00:31, between rounds",
    quote: "The keg went at half twelve. I tell Sam, she forgets by three.",
    needs: ["Flag stock, breakage, voids without leaving the bar", "Not feel like she's telling on anyone"],
    context: "Sees voids, run-outs, spills and breakages first. Three nights a week, studying in the day.",
    href: "/staff?role=bar",
    view: "Flags it from the bar",
  },
  {
    id: "opener",
    name: "Tom Baker",
    initials: "TB",
    role: "Opening manager",
    when: "11:00 next day",
    quote: "Give me the three things I need to do before we open. I'll read the rest when I have time.",
    needs: ["A short handover", "Open items that are now his"],
    context: "Arrives to a dark venue and a cellar to check. Reads on his phone while walking in.",
    href: "/handover",
    view: "Reads the handover",
  },
  {
    id: "owner",
    name: "Dana Kerr",
    initials: "DK",
    role: "Owner, 3 venues",
    when: "09:00, with coffee",
    quote: "Money, people, risk. And is it happening again?",
    needs: ["One morning digest across venues", "Patterns, not just events", "Proof incidents are documented"],
    context: "Decides on door staffing and insurance renewals. Doesn't want to chase managers for reports.",
    href: "/owner",
    view: "Reads the morning digest",
  },
  {
    id: "insurer",
    name: "Claims handler",
    initials: "CH",
    role: "Insurer, external",
    when: "Weeks later",
    quote: "I need timestamped facts, witnesses, and who wrote what. Not interpretation.",
    needs: ["A fixed format in third person", "Clear audit trail: what AI drafted, what a human confirmed, what is unknown"],
    context: "Reads the record when a guest claims. Format requirements: open question for Dorota.",
    href: "/insurer",
    view: "Reviews the incident record",
  },
];

// The presentation shows Sam (both nights), Mike reporting from the door and Dana reading the report.
// Ola, Tom and the insurer still work at their URLs, but are left out of the menus.
export const shownPersonas = personas.filter((p) => ["manager", "security", "owner"].includes(p.id));

export const personaById = (id: PersonaId) => personas.find((p) => p.id === id)!;
