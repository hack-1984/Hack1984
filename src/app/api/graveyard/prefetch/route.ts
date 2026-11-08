/**
 * POST /api/graveyard/prefetch — { idea } -> 202, no body.
 * Starts the idea's graveyard run after responding, so by the time the founder opens the
 * Graveyard it's usually cached. Called fire-and-forget when an idea is planted.
 * A no-op with MOCK_AI=1 (mocks are instant anyway, and testing should stay free).
 * The run lives in this server's memory: on a multi-instance host the later request may
 * land elsewhere and simply search again.
 */
import { after } from "next/server";
import type { GraveyardReq } from "@/server/conversation/deps";
import { badRequest, isMock, readBody } from "@/server/conversation/util";
import { getRecords } from "@/server/graveyard";

export async function POST(req: Request) {
  const body = await readBody<GraveyardReq>(req);
  if (!body) return badRequest("expected { idea }");
  if (!isMock()) {
    const idea = body.idea;
    after(() => getRecords(idea).then(
      (r) => console.log(`[graveyard] prefetched ${r.length} graves for ${idea.id}`),
      (e) => console.error("[graveyard] prefetch failed", e)
    ));
  }
  return new Response(null, { status: 202 });
}
