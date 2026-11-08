// Frozen contract: { graves: Grave[], adjacent }. Never change this shape.
import type { GraveyardReq } from "@/server/conversation/deps";
import { badRequest, isMock, readBody, serverError } from "@/server/conversation/util";
import { getRecords, isAdjacent, toGraves } from "@/server/graveyard";
import { mockRecordsFor } from "@/server/graveyard/mocks";

export async function POST(req: Request) {
  const body = await readBody<GraveyardReq>(req);
  if (!body) return badRequest("expected { idea }");
  try {
    const records = isMock() ? mockRecordsFor(body.idea) : await getRecords(body.idea);
    return Response.json({ graves: toGraves(records, body.idea), adjacent: isAdjacent(records) });
  } catch (e) {
    return serverError("graveyard", e);
  }
}
