import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { FIXTURE_IDEA } from "@/data/fixture-idea";
import type { TreeRequest, TreeResponse } from "@/lib/contracts";

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

  // TODO: gather() then generateTree(). Never return a 500 — fall back to a
  // tree with one red placeholder per pillar.
  return NextResponse.json({ error: "not implemented — set MOCK_AI=1" }, { status: 501 });
}
