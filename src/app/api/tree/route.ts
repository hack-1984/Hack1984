import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import type { TreeRequest, TreeResponse } from "@/lib/contracts";
import { fixtureFor } from "@/lib/modes";
import type { Idea, TeamProfile } from "@/lib/types";
import { TTLCache, cacheKey } from "@/server/cache";
import { extractBundle, gatherHits } from "@/server/research/gather";
import { assembleIdea, generateChoices } from "@/server/research/generateTree";

const EMPTY_TEAM: TeamProfile = { roles: [], skills: [], tech: [] };

/** Keyed on pitch + team, per the plan. */
const treeCache = new TTLCache<Idea>();

/** POST /api/tree — Ethan's intake. { pitch, team } -> { idea } */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<TreeRequest>;

  if (process.env.MOCK_AI === "1") {
    // fixtureFor() falls back to the startup fixture, so a request with no
    // mode behaves exactly as it did before nonprofit mode existed.
    const fixture = fixtureFor(body.mode);
    const idea: TreeResponse["idea"] = {
      ...fixture,
      id: nanoid(8),
      createdAt: Date.now(),
      pitch: body.pitch?.trim() || fixture.pitch,
    };
    return NextResponse.json({ idea } satisfies TreeResponse);
  }

  const pitch = body.pitch?.trim();
  if (!pitch) {
    return NextResponse.json({ error: "pitch is required" }, { status: 400 });
  }
  const team = body.team ?? EMPTY_TEAM;
  const mode = body.mode ?? "startup";
  // Keyed on mode too: the same pitch is a different tree in each mode.
  const key = cacheKey(pitch, team, mode);
  const t0 = Date.now();

  const cached = treeCache.get(key);
  if (cached) {
    // Fresh identity, cached content: two people entering the same pitch must
    // not end up sharing one idea.id, since the client keys state on it.
    console.log(`[api/tree] cache HIT in ${Date.now() - t0}ms for "${pitch.slice(0, 50)}"`);
    return NextResponse.json({
      idea: { ...cached, id: nanoid(8), createdAt: Date.now() },
    } satisfies TreeResponse);
  }

  // This route never returns a 500. Each phase degrades on its own:
  // extractBundle() returns an empty bundle, generateChoices() returns
  // placeholders, so the client always gets a renderable Idea.
  try {
    const hits = await gatherHits(pitch);
    const tSearch = Date.now();

    // The long pole is generation (~16s) against extraction (~7s). They read
    // the same hits and neither needs the other, so running them together
    // takes extraction off the critical path.
    const [research, choices] = await Promise.all([
      extractBundle(pitch, hits),
      generateChoices(pitch, hits, team),
    ]);

    const idea = assembleIdea(pitch, research, choices, mode);

    // Only cache a real tree. Caching a fallback would pin a bad result for
    // six hours, and the pitch would never get a second chance.
    const isFallback = idea.choices.every((c) => c.label === "Not figured out yet");
    if (!isFallback) treeCache.set(key, idea);

    console.log(
      `[api/tree] cache MISS, ${Date.now() - t0}ms total ` +
        `(search ${tSearch - t0}ms, parallel ${Date.now() - tSearch}ms) for "${pitch.slice(0, 50)}"` +
        `${isFallback ? " (fallback, not cached)" : ` (cached, ${treeCache.size} entries)`}`
    );
    return NextResponse.json({ idea } satisfies TreeResponse);
  } catch (err) {
    console.error(`[api/tree] unexpected failure after ${Date.now() - t0}ms:`, err);
    const idea = assembleIdea(
      pitch,
      { competitors: [], complaints: [], marketNotes: [] },
      await generateChoices(pitch, [], team),
      mode
    );
    return NextResponse.json({ idea } satisfies TreeResponse);
  }
}
