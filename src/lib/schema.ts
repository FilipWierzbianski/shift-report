import { z } from "zod";

// What Claude must return from a manager's brain-dump. Every fact carries the exact
// words it came from, so the UI can show the source and the manager can judge it.
const SECTIONS = ["general", "incidents", "audience", "security", "artists", "door", "production", "bar", "kitchen", "vendors", "private", "maintenance", "inventory"] as const;

export const ExtractedFact = z.object({
  category: z.enum(SECTIONS).describe("The report section this belongs to"),
  title: z.string().describe("Short headline, max 8 words, plain English"),
  detail: z.string().describe("Time, place, who. Only what was said or is in the data."),
  quote: z.string().describe("Exact words from the manager or a staff capture this fact is based on"),
  who: z.string().describe("Source: 'You', a staff name, or a system (POS, Door, Rota)"),
  incident: z.boolean().describe("True if it could matter to an insurer: injury, violence, ejection, police, damage"),
  carryOver: z.string().nullable().describe("Action for the next shift, or null"),
});

export const Extraction = z.object({
  facts: z.array(ExtractedFact),
  missing: z
    .array(z.enum(SECTIONS))
    .describe("Sections nothing was said about (all sections are optional)"),
});

export type ExtractionT = z.infer<typeof Extraction>;

export const SYSTEM_PROMPT = `You turn a tired bar manager's end-of-shift brain-dump into report facts.
Rules:
- Use only what the manager said, what staff captured, or the venue data you are given. Never invent names, times, injuries or amounts.
- If something is unclear, keep it vague in "detail" rather than guessing. Gaps are fine; the manager fills them later.
- Every fact needs the exact quote it came from.
- Mark incident=true for anything an insurer might ask about: injury, violence, ejection, police, property damage.
- File each fact under one report section: general overview, incidents, audience (experience, safety, concerns), security overview, artists and crew, door staff, production / run of show, bar staff (tills, cash), kitchen, third-party vendors, private events, maintenance and equipment, inventory.
- List sections that nothing was said about in "missing". Empty sections are fine; never pad them.`;
