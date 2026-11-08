// Full records for whatever the final graveyard design needs.
// Types: src/server/graveyard/types.ts (FailureRecord, DetailedRecord, GraveyardDetailRes).
import type { GraveyardReq } from "@/server/conversation/deps";
import { badRequest, isMock, readBody, serverError } from "@/server/conversation/util";
import { getRecords, isAdjacent, toDetailed, type GraveyardDetailRes } from "@/server/graveyard";
import { mockRecordsFor } from "@/server/graveyard/mocks";

export async function POST(req: Request) {
  const body = await readBody<GraveyardReq>(req);
  if (!body) return badRequest("expected { idea }");
  try {
    const records = isMock() ? mockRecordsFor(body.idea) : await getRecords(body.idea);
    const res: GraveyardDetailRes = { records: toDetailed(records, body.idea), adjacent: isAdjacent(records) };
    return Response.json(res);
  } catch (e) {
    return serverError("graveyard/detail", e);
  }
}
