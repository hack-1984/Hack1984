import { mockBuildFor, runBuild } from "@/server/build";
import type { BuildReq } from "@/server/conversation/deps";
import { badRequest, isMock, readBody, serverError } from "@/server/conversation/util";

export async function POST(req: Request) {
  const body = await readBody<BuildReq>(req);
  if (!body) return badRequest("expected { idea }");
  if (isMock()) return Response.json(mockBuildFor(body.idea));
  try {
    return Response.json(await runBuild(body.idea));
  } catch (e) {
    return serverError("build", e);
  }
}
