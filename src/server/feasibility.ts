import { z } from "zod";
import { MODELS, askJSON } from "@/lib/ai";
import { profileFor } from "@/lib/modes";
import type { Idea, Mode, TeamProfile, TreeUpdate } from "@/lib/types";

/**
 * Judge every active choice against the team that would actually build it.
 *
 * One call over all of them, not one per choice: the judgements are
 * comparative — "you only have 20 hours and three of these each need a
 * mobile developer" is a conclusion you cannot reach one choice at a time.
 */

const FeasibilityOut = z.object({
  assessments: z.array(
    z.object({
      choiceId: z.string(),
      ok: z.boolean(),
      note: z.string(),
      delta: z.number(),
    })
  ),
});

/**
 * What "can this team do it" means in each mode.
 *
 * A startup team is judged on whether it can BUILD the thing. A nonprofit
 * team is judged on whether it can RUN the thing — and the work that sinks
 * small nonprofits is rarely the programme itself. It is the overhead around
 * it: recruiting and re-recruiting volunteers, running background checks,
 * tracking restricted grants separately, and filing.
 */
const MODE_RULES: Record<Mode, string[]> = {
  startup: [],
  nonprofit: [
    "This is a nonprofit programme, not a product: judge whether this team can RUN it week to week, not build it.",
    "Volunteer-led delivery is not free labour — recruiting, scheduling and replacing volunteers is ongoing work for someone on this team. Count it against their hours.",
    "Anyone working unsupervised with children or vulnerable adults needs a background check, and somebody has to run and renew them.",
    "Restricted grants have to be tracked and reported separately, which needs real bookkeeping, plus a board and an annual Form 990.",
    "When the team has no admin or finance capacity, say so and name the lighter path: Form 1023-EZ, or a fiscal sponsor instead of its own 501(c)(3).",
    "Never judge a choice by whether it earns money.",
  ],
};

/** Short enough to sit in a drawer row. Enforced here, not asked for. */
function words(s: string, n: number): string {
  const parts = s.trim().split(/\s+/);
  return parts.length <= n ? s.trim() : `${parts.slice(0, n).join(" ")}…`;
}

export async function assessFeasibility(idea: Idea, team: TeamProfile): Promise<TreeUpdate[]> {
  const t0 = Date.now();
  const active = idea.choices.filter((c) => c.status === "active");
  if (active.length === 0) return [];

  const byId = new Map(active.map((c) => [c.id, c]));
  const mode = idea.mode ?? "startup";
  const profile = profileFor(mode);

  const out = await askJSON({
    system: [
      mode === "nonprofit"
        ? "You judge whether a specific team can realistically run each commitment in a plan."
        : "You judge whether a specific team can realistically build each bet in a plan.",
      "Return an entry ONLY for choices where your judgement should change the tree —",
      "say nothing about the ones that are simply fine.",
      `ok false means this team cannot realistically ${mode === "nonprofit" ? "run" : "build"} it: delta between -15 and -5,`,
      "the bigger the gap the more negative. ok true means it plays to a real strength",
      "this team has: delta exactly 3.",
      "note is one short clause naming the actual gap or strength, e.g.",
      mode === "nonprofit"
        ? "'Nobody on the team can run background checks'. No more than 10 words."
        : "'Needs a mobile developer; team has none'. No more than 10 words.",
      "Judge against the team as described, not against an ideal team, and be concrete",
      "about hours and budget when they are the binding constraint.",
      ...MODE_RULES[mode],
    ].join(" "),
    prompt: [
      `${profile.rootLabel}: ${idea.pitch}`,
      "",
      "TEAM:",
      `  roles: ${team.roles.join(", ") || "unknown"}`,
      `  skills: ${team.skills.join(", ") || "unknown"}`,
      `  tech: ${team.tech.join(", ") || "unknown"}`,
      team.hoursPerWeek ? `  hours per week, whole team: ${team.hoursPerWeek}` : "",
      team.budget ? `  budget: ${team.budget}` : "",
      "",
      mode === "nonprofit" ? "COMMITMENTS:" : "BETS:",
      ...active.map((c) => `  ${c.id} [${c.pillar}] ${c.label} — ${c.sub}: ${c.detail}`),
    ]
      .filter(Boolean)
      .join("\n"),
    schema: FeasibilityOut,
    model: MODELS.main,
    effort: "low",
    maxTokens: 4096,
  });

  const updates: TreeUpdate[] = [];
  let unknown = 0;

  for (const a of out.assessments) {
    // A judgement about a choice that does not exist is not a judgement.
    if (!byId.has(a.choiceId)) {
      unknown++;
      continue;
    }

    // Clamp to the ranges the plan specifies rather than trusting the model.
    const delta = a.ok ? 3 : Math.max(-15, Math.min(-5, Math.round(a.delta)));

    updates.push({
      action: a.ok ? "strengthen" : "weaken",
      choiceId: a.choiceId,
      delta,
      feasibility: { ok: a.ok, note: words(a.note, 10) },
      reason: words(a.note, 10),
      source: "feasibility",
      at: Date.now(),
    });
  }

  console.log(
    `[feasibility] ${mode}: ${Date.now() - t0}ms — ${active.length} active choices, ` +
      `${updates.length} updates (${updates.filter((u) => u.action === "weaken").length} weaken)` +
      `${unknown ? `, ${unknown} dropped for unknown choiceId` : ""}`
  );

  return updates;
}
