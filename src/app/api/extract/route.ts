import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { Extraction, SYSTEM_PROMPT, type ExtractionT } from "@/lib/schema";
import { captures, caughtFacts, missingAfterStory, people, soloFacts, stats, type Fact, type Scenario } from "@/lib/night";

// Scripted answer for the demo night: used when there is no API key, or when the call fails,
// so the prototype never dies on bad wifi in a basement office.
function scripted(scenario: Scenario): ExtractionT {
  const facts: Fact[] = scenario === "solo" ? soloFacts : caughtFacts;
  return {
    facts: facts.map((f) => ({
      category: f.category,
      title: f.title,
      detail: f.detail,
      quote: f.source.quote,
      who: f.source.who,
      incident: Boolean(f.incident),
      carryOver: f.carryOver ?? null,
    })),
    missing: missingAfterStory,
  };
}

export async function POST(req: Request) {
  const { story, scenario = "team" } = (await req.json()) as { story?: string; scenario?: Scenario };
  if (!story || !process.env.ANTHROPIC_API_KEY) {
    return Response.json({ source: "demo", ...scripted(scenario) });
  }

  const context = [
    `Venue data: ${stats.map((s) => `${s.label} (${s.source}): ${s.value}, ${s.note}`).join("; ")}`,
    scenario === "solo"
      ? "Staff captures: none tonight. Nobody on the team reported anything."
      : `Staff captures: ${captures.map((c) => `${c.time} ${people[c.by].short} [${c.tag}] ${c.text}`).join("; ")}`,
  ].join("\n");

  try {
    const client = new Anthropic();
    const res = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(Extraction) },
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `${context}\n\nManager's brain-dump:\n${story}` }],
    });
    if (res.stop_reason === "refusal" || !res.parsed_output) {
      return Response.json({ source: "demo", ...scripted(scenario) });
    }
    return Response.json({ source: "claude", ...res.parsed_output });
  } catch {
    return Response.json({ source: "demo", ...scripted(scenario) });
  }
}
