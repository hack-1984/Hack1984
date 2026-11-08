// POST /api/suggest — { idea, persona, messages, focusChoiceId? } -> { suggestions: string[] }
// Experimental: 3-4 lines the founder could send next in a Discussion. Never 5xx: on any
// failure it returns an empty list, since the composer works fine without it.
import { badRequest, isMock, readBody } from "@/server/conversation/util";
import { mockSuggestions, suggest, type SuggestReq, type SuggestRes } from "@/server/suggest";

export async function POST(req: Request) {
  const body = await readBody<SuggestReq>(req);
  if (!body || !body.persona?.role) return badRequest("expected { idea, persona, messages }");
  body.messages = Array.isArray(body.messages) ? body.messages.filter((m) => m && typeof m.text === "string") : [];
  if (isMock()) return Response.json({ suggestions: mockSuggestions(body) } satisfies SuggestRes);
  try {
    return Response.json(await suggest(body));
  } catch (e) {
    console.warn(`[suggest] ${e instanceof Error ? e.message : e}`);
    return Response.json({ suggestions: [] } satisfies SuggestRes);
  }
}
