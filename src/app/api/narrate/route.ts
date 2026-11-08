/**
 * POST /api/narrate — { name, description, mode? } -> { lines }
 * 8-10 idea-specific status lines for the planting scene (src/ideas/planting.ts).
 * Haiku, once per plant. Never 5xx: on any failure it answers with true generic lines.
 * MOCK_AI=1 returns fixture lines instantly.
 */
import type { NarrateRequest, NarrateResponse } from "@/ideas/planting";
import { fallbackLines, narrate } from "@/server/narrate";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<NarrateRequest>;
  const name = typeof body.name === "string" ? body.name : "";
  const description = typeof body.description === "string" ? body.description : "";
  const mode = body.mode === "nonprofit" ? "nonprofit" : "startup";
  if (!name.trim() && !description.trim()) {
    return Response.json({ lines: fallbackLines("your idea", mode) } satisfies NarrateResponse);
  }
  const lines = await narrate(name, description, mode);
  return Response.json({ lines } satisfies NarrateResponse);
}
