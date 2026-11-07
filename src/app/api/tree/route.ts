import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { FIXTURE_IDEA } from "@/data/fixture-idea";
import type { TreeRequest, TreeResponse } from "@/lib/contracts";
import type { TeamProfile } from "@/lib/types";
import { gather } from "@/server/research/gather";
import { generateTree } from "@/server/research/generateTree";

const EMPTY_TEAM: TeamProfile = { roles: [], skills: [], tech: [] };

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

  // This route never returns a 500. gather() degrades to an empty bundle and
  // generateTree() falls back to a red placeholder tree, so the client always
  // gets a renderable Idea.
  const t0 = Date.now();
  try {
    const research = await gather(pitch);
    const idea = await generateTree(pitch, research, team);
    console.log(`[api/tree] ${Date.now() - t0}ms total for "${pitch.slice(0, 50)}"`);
    return NextResponse.json({ idea } satisfies TreeResponse);
  } catch (err) {
    console.error(`[api/tree] unexpected failure after ${Date.now() - t0}ms:`, err);
    const idea = await generateTree(pitch, { competitors: [], complaints: [], marketNotes: [] }, team);
    return NextResponse.json({ idea } satisfies TreeResponse);
  }
}
