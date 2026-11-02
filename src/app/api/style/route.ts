import { writeFile } from "node:fs/promises";
import path from "node:path";

// Dev only: the "Aa" panel saves the chosen fonts/colours here so Claude can bake them into globals.css.
export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return new Response("Not available", { status: 404 });
  const { style, css } = (await req.json()) as { style: unknown; css: string };
  const root = process.cwd();
  await writeFile(path.join(root, "style.json"), JSON.stringify(style, null, 2) + "\n");
  await writeFile(path.join(root, "style.css"), css + "\n");
  return Response.json({ ok: true });
}
