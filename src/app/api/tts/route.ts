// The agent's voice: ElevenLabs text-to-speech. Without ELEVENLABS_API_KEY the agent stays silent
// (GET says so), so the prototype works the same, just quietly.

const VOICE = process.env.ELEVENLABS_VOICE_ID || "JBFqnCBsd6RMkjVDRZzb";
const MODEL = process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5";
// Agent lines repeat across runs; keep them in memory so each one costs credits once.
const cache = new Map<string, ArrayBuffer>();

export async function GET() {
  return Response.json({ enabled: Boolean(process.env.ELEVENLABS_API_KEY) });
}

export async function POST(req: Request) {
  const key = process.env.ELEVENLABS_API_KEY;
  const { text, lang } = (await req.json()) as { text?: string; lang?: "en" | "pl" };
  if (!key || !text || text.length > 600) return new Response(null, { status: 204 });
  const id = `${lang}:${text}`;
  let audio = cache.get(id);
  if (!audio) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({ text, model_id: MODEL, language_code: lang === "pl" ? "pl" : "en" }),
    });
    if (!res.ok) return new Response(null, { status: 204 });
    audio = await res.arrayBuffer();
    if (cache.size > 300) cache.clear();
    cache.set(id, audio);
  }
  return new Response(audio, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
