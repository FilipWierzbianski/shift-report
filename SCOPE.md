# Scope — Create Shift Report (deliberately raw)

> Filip Wierzbiański · Tonik Design & Build task · 1 Nov 2026

## The one sentence
At 3am the manager doesn't need a form. They need someone who already knows half the night, asks about the other half, and won't let an insurance-relevant incident slip through.

## Who / where / when
- Closing manager, 10h into the shift, 3:00, lights half up, music off, staff stacking chairs.
- Phone in one hand (the other holds keys / cash bag). Bad signal in the basement office.
- Motivation to write: ~zero. Motivation to go home: maximum.
- Readers of the report: **next shift** (what's broken, what's low, what's open), **owner / GM** (money, staff), **insurer** (incidents — must be complete, timestamped, factual).

## What already exists (research, 1 Nov)
- Manager logbooks: 7shifts, Fourth/HotSchedules, Jolt → forms with free-text boxes.
- Venue incident registers: VenueAware, AusComply → thorough, slow, compliance-first.
- AI-flavoured: Mise, Enterprise DNA, Log Sheet → AI **tidies what you typed**.
- **Gap:** nobody helps you **remember what you didn't type**. That's the "I didn't forget anything" half of the brief, and it's our angle.

## Principles
1. **Start from what the systems already know.** POS, door counter, rota pre-fill the night. The manager confirms, doesn't write.
2. **One input, no mode choice.** A single "Tell me about the night" box (voice first). Structure grows next to it as a live checklist of categories — guided and freeform at the same time, no upfront choice.
3. **AI asks, it doesn't assume.** Recall questions borrowed from the police *cognitive interview* (≈40% more correct detail): reinstate context from data ("peak at 1:10, 380 people — what was happening?"), different perspective ("what would security say?"), anomalies ("6 voids in 10 min at 23:40"). Max 3, one at a time, each skippable, "nothing" is one tap.
4. **AI never invents incident facts.** Insurance fields are pre-filled only from what was said; anything missing is a visible `[ gap ]` (pattern from Axon Draft One). The manager can mark "unknown" — honest gaps beat fabricated detail.
5. **Every AI claim shows its source** (the sentence or data point it came from). Incidents are never bulk-confirmed.
6. **Forgiving:** autosave every change, undo on every card, "finish in the morning" exit, works with nothing typed at all.
7. **3am mode:** dark, warm, high contrast, 48px+ targets, one accent (amber, like the light behind the bar), no blue glare.

## The flow I'm building (5 screens)
1. **Your night** — numbers from POS + door, a night timeline, the bits captured during the shift (photo, voice note, quick note). Big mic: "Tell me about the night". Live checklist of categories filling as you speak.
2. **AI found** — fact cards to confirm. Incidents pinned on top, each with its source quote. "Confirm the rest" in one tap (not incidents).
3. **Anything else?** ← polished screen. 2–3 recall questions, one at a time, generated from data + gaps in the story.
4. **Incident** — insurer-ready fields, AI-filled, `[ gaps ]` to close.
5. **Done** — the report as a bar receipt: handover for the next shift on top, full record below, open items carried to tomorrow's shift.

Target: < 10 min for a typical night. Demo path: ~4 min. A timer is visible in the prototype on purpose.

## Personas (full versions live in the prototype hub)
- **Sam Reyes, closing manager (primary).** 03:02 after a 10-hour shift. Wants it off her plate by 03:10, fears missing an insurance detail. Some nights she brain-dumps, some nights she wants to be asked.
- **Mike Adeyemi, door supervisor.** Holds the facts insurers need (names, CCTV, ejections). Needs to report in 10 seconds, gloves on.
- **Ola Nowak, bartender.** Sees stock-outs, voids, breakages first. Won't leave the bar to report.
- **Tom Baker, opening manager (reader).** 11:00. Wants three things to do before open.
- **Dana Kerr, owner of 3 venues (reader).** 09:00. Money, people, risk, and "is it happening again?"
- **Insurer claims handler (external reader).** Weeks later. Timestamped facts, witnesses, who wrote what.

## Decisions taken from my FigJam notes
- **The report drafts itself, the manager fills the gaps.** POS + door + rota + staff captures make a ~70% draft before Sam opens the app.
- **Staff report in one gesture during the night** (camera or voice). Fights and injuries notify the manager immediately and land in her draft.
- **Two doors, no mode choice:** "Tell me" (brain-dump) or "Ask me" (one question at a time with common answers). Both end in the same report. After a brain-dump the agent says what it caught and what is still missing.
- **"Next, next, next" kills recall.** The recall screen asks about things the data says happened (anomalies, the peak, someone else's view), never generic prompts.
- **Fast vs thorough is decided by risk, not by the manager.** Quiet night: 1 question. Incident tonight or a venue with a history: 3. In a real project we'd set the thresholds with the client from their data.
- **Safety net:** no report 20 minutes after close → the agent calls and collects the basics by voice.
- **Colour has a job:** lime = the AI did this; orange = a human needs to act; bone = human actions.
- **Open question for Dorota:** does the insurer prescribe a report format, and do they accept AI-drafted text? Until we know: fixed fields, third person, and an audit trail of who wrote what.

## Two agent styles
A · Rings (a compact object of light) and B · Ribbons (a band of light across the screen, voice-first). Same flow, same states (idle, listening, thinking, speaking); speed eases between states and follows voice level.

## AI in the build
- Real Claude call (structured output, Zod schema) at `/api/extract` when `ANTHROPIC_API_KEY` is set; scripted demo night otherwise, so the demo never depends on wifi.
- Demo night: fight at 1:40, guest cut hand on glass, till £45 short, IPA keg kicked, DJ 50 min late.

## Out of scope (on purpose)
Auth, multi-venue, real integrations, real uploads, editing the report after sending, notifications, analytics, i18n.

## Assumptions I made (questions sent to Dorota — correct me)
- Device: the manager's own phone, not a back-office PC.
- Readers: next shift + owner + insurer (UK-style incident fields).
- Today: WhatsApp group + notes app + a paper book for incidents.
- Integrations with POS / door counter / rota are plausible for v1.
- Managers would capture 1-tap notes during the shift if it's fast enough.

## What I'd do next
Offline-first capture during the shift · testing at 3am with 3 real managers · insurer field set validated with a broker · trend view for owners (recurring incidents, stock run-outs).
