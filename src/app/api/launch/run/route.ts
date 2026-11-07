import { NextResponse } from "next/server";
import type { LaunchRunRequest, LaunchRunResponse } from "@/lib/contracts";
import { TTLCache, cacheKey } from "@/server/cache";
import { MOCK_SCENE, mockPersonas, mockResults, mockUpdates, summarise as mockSummarise } from "@/server/launch/mock";
import { fallbackScene } from "@/server/launch/scene";
import { judge, summarise, toUpdates } from "@/server/launch/run";

/** Keyed on idea.id + price, per the plan. */
const runCache = new TTLCache<LaunchRunResponse>();

/**
 * POST /api/launch/run — Ethan's Launch Day.
 * { idea, scene, personas, price } -> { results, summary, updates }
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<LaunchRunRequest>;
  const price = typeof body.price === "number" ? body.price : 8;

  if (process.env.MOCK_AI === "1") {
    const scene = body.scene ?? MOCK_SCENE;
    const personas = body.personas?.length ? body.personas : mockPersonas(scene);
    const results = mockResults(personas, price);
    const summary = mockSummarise(results, personas, scene, price);
    return NextResponse.json({
      results,
      summary,
      updates: mockUpdates(summary),
    } satisfies LaunchRunResponse);
  }

  if (!body.idea || !body.personas?.length) {
    return NextResponse.json({ error: "idea and personas are required" }, { status: 400 });
  }
  const idea = body.idea;
  const personas = body.personas;
  const scene = body.scene ?? fallbackScene(idea);

  const key = cacheKey(idea.id, price);
  const cached = runCache.get(key);
  if (cached) {
    console.log(`[api/launch/run] cache HIT for ${idea.id} at $${price}`);
    return NextResponse.json(cached satisfies LaunchRunResponse);
  }

  const t0 = Date.now();
  try {
    const results = await judge(idea, personas, price);
    const summary = await summarise(idea, results, personas, scene, price);
    const updates = toUpdates(idea, summary, results);

    const payload: LaunchRunResponse = { results, summary, updates };
    runCache.set(key, payload);

    console.log(
      `[api/launch/run] ${Date.now() - t0}ms — buy ${summary.buy}, curious ${summary.curious}, ` +
        `leave ${summary.leave}, drop-off $${summary.dropOffPrice}, ${updates.length} updates`
    );
    return NextResponse.json(payload satisfies LaunchRunResponse);
  } catch (err) {
    console.error(`[api/launch/run] unexpected after ${Date.now() - t0}ms:`, err);
    const results = mockResults(personas, price);
    const summary = mockSummarise(results, personas, scene, price);
    return NextResponse.json({
      results,
      summary,
      updates: mockUpdates(summary),
    } satisfies LaunchRunResponse);
  }
}
