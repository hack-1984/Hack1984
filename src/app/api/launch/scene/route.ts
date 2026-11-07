import { NextResponse } from "next/server";
import type { LaunchSceneResponse } from "@/lib/contracts";
import { MOCK_SCENE } from "@/server/launch/mock";

/** POST /api/launch/scene — Ethan's Launch Day. { idea } -> { scene } */
export async function POST(req: Request) {
  await req.json().catch(() => ({}));

  if (process.env.MOCK_AI === "1") {
    return NextResponse.json({ scene: MOCK_SCENE } satisfies LaunchSceneResponse);
  }

  // TODO: askJSON -> SceneSpec. Validate center.icon against lucide-react's
  // icon names, falling back to "Store". On failure return one "Customers"
  // group of 100 in teal.
  return NextResponse.json({ error: "not implemented — set MOCK_AI=1" }, { status: 501 });
}
