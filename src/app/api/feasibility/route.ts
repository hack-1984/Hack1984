import { NextResponse } from "next/server";
import type { FeasibilityRequest, FeasibilityResponse } from "@/lib/contracts";
import type { TreeUpdate } from "@/lib/types";

/** POST /api/feasibility — Greg's Team drawer. { idea, team } -> { updates } */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<FeasibilityRequest>;

  if (process.env.MOCK_AI === "1") {
    const target =
      body.idea?.choices?.find((c) => c.status === "active" && c.pillar === "solution") ??
      body.idea?.choices?.find((c) => c.status === "active");

    const updates: TreeUpdate[] = [
      {
        action: "weaken",
        choiceId: target?.id ?? "sol-1",
        delta: -10,
        feasibility: { ok: false, note: "Needs a mobile developer; team has none" },
        reason: "Team cannot realistically build this.",
        source: "feasibility",
        at: Date.now(),
      },
    ];
    return NextResponse.json({ updates } satisfies FeasibilityResponse);
  }

  // TODO: one askJSON call over all active choices + the team profile.
  return NextResponse.json({ error: "not implemented — set MOCK_AI=1" }, { status: 501 });
}
