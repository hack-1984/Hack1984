import { runChat } from "@/server/conversation/chat";
import type { ChatReq } from "@/server/conversation/deps";
import { mockChat } from "@/server/conversation/mocks";
import { badRequest, isMock, readBody, serverError } from "@/server/conversation/util";

export async function POST(req: Request) {
  const body = await readBody<ChatReq>(req);
  if (!body || !body.persona?.role) return badRequest("expected { idea, persona, messages }");
  body.messages = Array.isArray(body.messages) ? body.messages.filter((m) => m && typeof m.text === "string") : [];
  if (isMock()) return Response.json(mockChat(body));
  try {
    return Response.json(await runChat(body));
  } catch (e) {
    return serverError("chat", e);
  }
}
