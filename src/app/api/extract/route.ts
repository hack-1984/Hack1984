import type { ExtractReq } from "@/server/conversation/deps";
import { runExtract } from "@/server/conversation/extract";
import { mockExtract } from "@/server/conversation/mocks";
import { badRequest, isMock, readBody, serverError } from "@/server/conversation/util";

export async function POST(req: Request) {
  const body = await readBody<ExtractReq>(req);
  if (!body || !Array.isArray(body.messages) || !body.source) return badRequest("expected { idea, messages, source }");
  body.messages = body.messages.filter((m) => m && typeof m.text === "string");
  if (isMock()) return Response.json({ updates: mockExtract(body) });
  try {
    return Response.json({ updates: await runExtract(body) });
  } catch (e) {
    return serverError("extract", e);
  }
}
