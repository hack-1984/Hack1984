import { NextResponse } from "next/server";
import type { LaunchRunRequest, LaunchRunResponse } from "@/lib/contracts";
import { TTLCache, cacheKey } from "@/server/cache";
import { mockPersonas, mockResults, mockScene, mockUpdates, summarise as mockSummarise } from "@/server/launch/mock";
import { launchMode } from "@/server/launch/modes";
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
  const mode = body.idea?.mode;
  // A missing price means the mode's own default: $8 on Launch Day, 4 hours
  // a month at an Open House.
  const price = typeof body.price === "number" ? body.price : mode === "nonprofit" ? 4 : 8;

  if (process.env.MOCK_AI === "1") {
    const scene = body.scene ?? mockScene(mode);
    const personas = body.personas?.length ? body.personas : mockPersonas(scene, mode);
    const results = mockResults(personas, price, mode);
    const summary = mockSummarise(results, personas, scene, price, mode);
    return NextResponse.json({
      results,
      summary,
      updates: mockUpdates(summary, mode),
    } satisfies LaunchRunResponse);
  }

  if (!body.idea || !body.personas?.length) {
    return NextResponse.json({ error: "idea and personas are required" }, { status: 400 });
  }
  const idea = body.idea;
  const personas = body.personas;
  const scene = body.scene ?? fallbackScene(idea);

  const unit = launchMode(mode).unitLabel;

  const key = cacheKey(idea.id, price, mode);
  const cached = runCache.get(key);
  if (cached) {
    console.log(`[api/launch/run] cache HIT for ${idea.id} at ${unit(price)}`);
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
      `[api/launch/run] ${mode ?? "startup"}: ${Date.now() - t0}ms — buy ${summary.buy}, ` +
        `curious ${summary.curious}, leave ${summary.leave}, ` +
        `drop-off ${unit(summary.dropOffPrice)}, ${updates.length} updates\n` +
        summary.byGroup
          .map((g) => `    ${g.name} (${g.size}): ${g.buyRate}% buy, stops at ${unit(g.dropOffPrice)}`)
          .join("\n")
    );
    return NextResponse.json(payload satisfies LaunchRunResponse);
  } catch (err) {
    console.error(`[api/launch/run] unexpected after ${Date.now() - t0}ms:`, err);
    // Mode matters even here. A nonprofit run that falls back to the startup
    // mocks would put an update on Funding, which is the one thing an Open
    // House is never allowed to do.
    const results = mockResults(personas, price, mode);
    const summary = mockSummarise(results, personas, scene, price, mode);
    return NextResponse.json({
      results,
      summary,
      updates: mockUpdates(summary, mode),
    } satisfies LaunchRunResponse);
  }
}
