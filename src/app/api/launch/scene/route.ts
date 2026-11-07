import { NextResponse } from "next/server";
import type { LaunchSceneRequest, LaunchSceneResponse } from "@/lib/contracts";
import { mockScene } from "@/server/launch/mock";
import { buildScene, fallbackScene } from "@/server/launch/scene";

/** POST /api/launch/scene — Ethan's Launch Day / Open House. { idea } -> { scene } */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<LaunchSceneRequest>;

  if (process.env.MOCK_AI === "1") {
    return NextResponse.json({
      scene: mockScene(body.idea?.mode),
    } satisfies LaunchSceneResponse);
  }

  if (!body.idea) {
    return NextResponse.json({ error: "idea is required" }, { status: 400 });
  }

  try {
    return NextResponse.json({ scene: await buildScene(body.idea) } satisfies LaunchSceneResponse);
  } catch (err) {
    console.error("[api/launch/scene] unexpected:", err);
    return NextResponse.json({ scene: fallbackScene(body.idea) } satisfies LaunchSceneResponse);
  }
}
