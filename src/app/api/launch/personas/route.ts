import { NextResponse } from "next/server";
import type { LaunchPersonasRequest, LaunchPersonasResponse } from "@/lib/contracts";
import { MOCK_SCENE, mockPersonas } from "@/server/launch/mock";

/** POST /api/launch/personas — Ethan's Launch Day. { idea, scene } -> { personas } */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<LaunchPersonasRequest>;

  if (process.env.MOCK_AI === "1") {
    const personas = mockPersonas(body.scene ?? MOCK_SCENE);
    return NextResponse.json({ personas } satisfies LaunchPersonasResponse);
  }

  // TODO: 10 parallel askJSON calls on MODELS.fast, 10 personas each, spread
  // across groups in proportion to count. Seed each batch with one of
  // idea.research.complaints and set sourceUrl.
  return NextResponse.json({ error: "not implemented — set MOCK_AI=1" }, { status: 501 });
}
