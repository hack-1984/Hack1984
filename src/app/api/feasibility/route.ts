import { NextResponse } from "next/server";
import type { FeasibilityRequest, FeasibilityResponse } from "@/lib/contracts";
import type { TeamProfile, TreeUpdate } from "@/lib/types";
import { assessFeasibility } from "@/server/feasibility";

const EMPTY_TEAM: TeamProfile = { roles: [], skills: [], tech: [] };

/** POST /api/feasibility — Greg's Team drawer. { idea, team } -> { updates } */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<FeasibilityRequest>;

  if (process.env.MOCK_AI === "1") {
    const nonprofit = body.idea?.mode === "nonprofit";

    // Nonprofit feasibility is about running the programme, not building an
    // app: the binding constraint is who may be alone with a minor.
    const pillar = nonprofit ? "approach" : "solution";
    const target =
      body.idea?.choices?.find((c) => c.status === "active" && c.pillar === pillar) ??
      body.idea?.choices?.find((c) => c.status === "active");

    const updates: TreeUpdate[] = [
      {
        action: "weaken",
        choiceId: target?.id ?? (nonprofit ? "app-1" : "sol-1"),
        delta: -10,
        feasibility: nonprofit
          ? {
              ok: false,
              note: "Mentors working with minors need background checks; no one on the team runs them yet",
            }
          : { ok: false, note: "Needs a mobile developer; team has none" },
        reason: nonprofit
          ? "Team cannot staff the programme as described."
          : "Team cannot realistically build this.",
        source: "feasibility",
        at: Date.now(),
      },
    ];
    return NextResponse.json({ updates } satisfies FeasibilityResponse);
  }

  if (!body.idea) {
    return NextResponse.json({ error: "idea is required" }, { status: 400 });
  }

  try {
    const updates = await assessFeasibility(body.idea, body.team ?? EMPTY_TEAM);
    return NextResponse.json({ updates } satisfies FeasibilityResponse);
  } catch (err) {
    // An empty update list is a valid answer. Greg's drawer should render
    // "nothing to flag" rather than break because one call failed.
    console.error("[api/feasibility] failed:", err);
    return NextResponse.json({ updates: [] } satisfies FeasibilityResponse);
  }
}
