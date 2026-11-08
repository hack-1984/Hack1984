// POST /api/node/research — { idea, choiceId, team? } -> { updates }
import { badRequest, isMock, readBody, serverError } from "@/server/conversation/util";
import { findChoice, mockResearch, runResearch, type NodeReq } from "@/server/node";

export async function POST(req: Request) {
  const body = await readBody<NodeReq>(req);
  if (!body || typeof body.choiceId !== "string") return badRequest("expected { idea, choiceId }");
  if (!findChoice(body.idea, body.choiceId)) return badRequest(`no active choice "${body.choiceId}"`);
  if (isMock()) return Response.json({ updates: mockResearch(body) });
  try {
    return Response.json({ updates: await runResearch(body) });
  } catch (e) {
    return serverError("node/research", e);
  }
}
