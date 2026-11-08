import { NextResponse } from "next/server";
import type { LaunchPersonasRequest, LaunchPersonasResponse } from "@/lib/contracts";
import { mockPersonas, mockScene } from "@/server/launch/mock";
import { buildPersonas } from "@/server/launch/personas";
import { fallbackScene } from "@/server/launch/scene";

/** POST /api/launch/personas — Ethan's Launch Day / Open House. { idea, scene } -> { personas } */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<LaunchPersonasRequest>;

  if (process.env.MOCK_AI === "1") {
    const mode = body.idea?.mode;
    // `seed` is optional and outside the frozen contract: "Run again with a new crowd" sends a fresh one.
    const seed = (body as { seed?: number }).seed;
    return NextResponse.json({
      personas: mockPersonas(body.scene ?? mockScene(mode), mode, typeof seed === "number" ? seed : undefined),
    } satisfies LaunchPersonasResponse);
  }

  if (!body.idea) {
    return NextResponse.json({ error: "idea is required" }, { status: 400 });
  }
  const scene = body.scene ?? fallbackScene(body.idea);

  try {
    const personas = await buildPersonas(body.idea, scene);
    return NextResponse.json({ personas } satisfies LaunchPersonasResponse);
  } catch (err) {
    // buildPersonas already pads failed batches; this is the last net.
    console.error("[api/launch/personas] unexpected:", err);
    return NextResponse.json({ personas: mockPersonas(scene) } satisfies LaunchPersonasResponse);
  }
}
