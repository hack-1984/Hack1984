import { NextResponse } from "next/server";
import type { LaunchRunRequest, LaunchRunResponse } from "@/lib/contracts";
import { MOCK_SCENE, mockPersonas, mockResults, mockUpdates, summarise } from "@/server/launch/mock";

/**
 * POST /api/launch/run — Ethan's Launch Day.
 * { idea, scene, personas, price } -> { results, summary, updates }
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<LaunchRunRequest>;

  if (process.env.MOCK_AI === "1") {
    const scene = body.scene ?? MOCK_SCENE;
    const personas = body.personas?.length ? body.personas : mockPersonas(scene);
    const price = typeof body.price === "number" ? body.price : 8;

    const results = mockResults(personas, price);
    const summary = summarise(results, personas, scene, price);
    const updates = mockUpdates(summary);

    return NextResponse.json({ results, summary, updates } satisfies LaunchRunResponse);
  }

  // TODO: 10 parallel MODELS.fast calls judging each persona at the price,
  // then compute LaunchSummary in code and map it to TreeUpdate[].
  return NextResponse.json({ error: "not implemented — set MOCK_AI=1" }, { status: 501 });
}
