import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { FIXTURE_IDEA } from "@/data/fixture-idea";
import type { TreeRequest, TreeResponse } from "@/lib/contracts";
import type { Idea, TeamProfile } from "@/lib/types";
import { TTLCache, cacheKey } from "@/server/cache";
import { gather } from "@/server/research/gather";
import { generateTree } from "@/server/research/generateTree";

const EMPTY_TEAM: TeamProfile = { roles: [], skills: [], tech: [] };

/** Keyed on pitch + team, per the plan. */
const treeCache = new TTLCache<Idea>();

/** POST /api/tree — Ethan's intake. { pitch, team } -> { idea } */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<TreeRequest>;

  if (process.env.MOCK_AI === "1") {
    const idea: TreeResponse["idea"] = {
      ...FIXTURE_IDEA,
      id: nanoid(8),
      createdAt: Date.now(),
      pitch: body.pitch?.trim() || FIXTURE_IDEA.pitch,
    };
    return NextResponse.json({ idea } satisfies TreeResponse);
  }

  const pitch = body.pitch?.trim();
  if (!pitch) {
    return NextResponse.json({ error: "pitch is required" }, { status: 400 });
  }
  const team = body.team ?? EMPTY_TEAM;
  const key = cacheKey(pitch, team);
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

  // This route never returns a 500. gather() degrades to an empty bundle and
  // generateTree() falls back to a red placeholder tree, so the client always
  // gets a renderable Idea.
  try {
    const research = await gather(pitch);
    const idea = await generateTree(pitch, research, team);

    // Only cache a real tree. Caching a fallback would pin a bad result for
    // six hours, and the pitch would never get a second chance.
    const isFallback = idea.choices.every((c) => c.label === "Not figured out yet");
    if (!isFallback) treeCache.set(key, idea);

    console.log(
      `[api/tree] cache MISS, ${Date.now() - t0}ms total for "${pitch.slice(0, 50)}"` +
        `${isFallback ? " (fallback, not cached)" : ` (cached, ${treeCache.size} entries)`}`
    );
    return NextResponse.json({ idea } satisfies TreeResponse);
  } catch (err) {
    console.error(`[api/tree] unexpected failure after ${Date.now() - t0}ms:`, err);
    const idea = await generateTree(pitch, { competitors: [], complaints: [], marketNotes: [] }, team);
    return NextResponse.json({ idea } satisfies TreeResponse);
  }
}
