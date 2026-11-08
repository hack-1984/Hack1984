import type { PersonaReq, PersonaRole } from "@/server/conversation/deps";
import { mockPersonaFor } from "@/server/conversation/mocks";
import { makePersona } from "@/server/conversation/persona";
import { badRequest, isMock, readBody, serverError } from "@/server/conversation/util";

const ROLES: PersonaRole[] = ["customer", "competitor", "investor", "advisor"];

export async function POST(req: Request) {
  const body = await readBody<PersonaReq>(req);
  if (!body) return badRequest("expected { idea, role }");
  if (!ROLES.includes(body.role)) return badRequest(`role must be one of ${ROLES.join(", ")}`);
  if (isMock()) return Response.json({ persona: mockPersonaFor(body.idea, body.role) });
  try {
    return Response.json({ persona: await makePersona(body.idea, body.role, body.choiceId) });
  } catch (e) {
    return serverError("persona", e);
  }
}
