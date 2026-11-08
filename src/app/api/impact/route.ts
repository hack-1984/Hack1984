// POST /api/impact — { idea } -> { logicModel, updates }. Theory of change for Greg's Build modal.
import type { ImpactReq } from "@/server/conversation/deps";
import { badRequest, isMock, readBody, serverError } from "@/server/conversation/util";
import { mockImpact, runImpact } from "@/server/impact";

export async function POST(req: Request) {
  const body = await readBody<ImpactReq>(req);
  if (!body) return badRequest("expected { idea }");
  if (isMock()) return Response.json(mockImpact(body.idea));
  try {
    return Response.json(await runImpact(body.idea));
  } catch (e) {
    return serverError("impact", e);
  }
}
