// POST /api/node/plan — { idea, choiceId, team? } -> { steps }
import { badRequest, isMock, readBody, serverError } from "@/server/conversation/util";
import { findChoice, mockPlan, runPlan, type NodeReq } from "@/server/node";

export async function POST(req: Request) {
  const body = await readBody<NodeReq>(req);
  if (!body || typeof body.choiceId !== "string") return badRequest("expected { idea, choiceId }");
  if (!findChoice(body.idea, body.choiceId)) return badRequest(`no active choice "${body.choiceId}"`);
  if (isMock()) return Response.json({ steps: mockPlan(body) });
  try {
    return Response.json({ steps: await runPlan(body) });
  } catch (e) {
    return serverError("node/plan", e);
  }
}
