import { NextResponse } from "next/server";
import { FAKE_TREE } from "@/data/fakeTree";
import { TreeResponseSchema } from "@/lib/schemas";

/**
 * STUB. Returns a hardcoded tree so the frontend can render today.
 * Replace the body with the Claude call that generates a tree from { pitch, mode, team }.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));

  const idea = {
    ...FAKE_TREE,
    mode: body?.mode === "nonprofit" ? ("nonprofit" as const) : FAKE_TREE.mode,
    pitch: typeof body?.pitch === "string" && body.pitch.length > 0 ? body.pitch : FAKE_TREE.pitch,
  };

  return NextResponse.json(TreeResponseSchema.parse({ idea }));
}

export async function GET() {
  return NextResponse.json(TreeResponseSchema.parse({ idea: FAKE_TREE }));
}
