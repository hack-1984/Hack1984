import { z } from "zod";
import { MODELS, askJSON } from "@/lib/ai";
import { decide } from "@/lib/decide";
import { PILLAR_KEYS } from "@/lib/pillars";
import type {
  Idea,
  LaunchSummary,
  PillarKey,
  SceneSpec,
  SimPersona,
  SimResult,
  TreeUpdate,
} from "@/lib/types";
import { launchMode, type LaunchMode } from "./modes";
import { bestGroup, byGroup, dropOffPrice, type LaunchSummaryPlus } from "./summary";

/** 20 calls of 5 rather than 10 of 10, for the reason given in personas.ts. */
const BATCHES = 20;

const JudgeOut = z.object({
  verdicts: z.array(
    z.object({
      reason: z.string(),
      maxPrice: z.number(),
      tellsFriend: z.boolean(),
    })
  ),
});

const ObjectionsOut = z.object({
  objections: z
    .array(z.object({ text: z.string(), count: z.number(), pillar: z.string() }))
    .max(3),
});

function chunk<T>(xs: T[], n: number): T[][] {
  const out: T[][] = Array.from({ length: n }, () => []);
  xs.forEach((x, i) => out[i % n].push(x));
  return out;
}

/**
 * Word limits are enforced here, not just asked for in the prompt.
 * The model routinely returned 20-word "at most 8 words" reasons, and these
 * strings are rendered next to a figure on screen.
 */
function words(s: string, n: number): string {
  const parts = s.trim().split(/\s+/);
  return parts.length <= n ? s.trim() : `${parts.slice(0, n).join(" ")}…`;
}

const asPillar = (s: string): PillarKey => {
  const t = s.toLowerCase().trim() as PillarKey;
  return PILLAR_KEYS.includes(t) ? t : "problem";
};

/** A pillar this mode protects is sent somewhere it can honestly land. */
const remap = (pillar: PillarKey, m: LaunchMode): PillarKey =>
  m.neverUpdate.includes(pillar) ? m.remapTo : pillar;

/** Ask the model what each persona would pay; decide buy/curious/leave in code. */
export async function judge(
  idea: Idea,
  personas: SimPersona[],
  price: number
): Promise<SimResult[]> {
  const t0 = Date.now();
  const batches = chunk(personas, BATCHES);
  const m = launchMode(idea.mode);
  const nonprofit = idea.mode === "nonprofit";

  const settled = await Promise.allSettled(
    batches.map((batch) =>
      batch.length === 0
        ? Promise.resolve({ verdicts: [] })
        : askJSON({
            system: [
              ...m.prompts.judgeRules,
              "Return one verdict per person, in the order given.",
            ].join(" "),
            prompt: [
              `${m.prompts.personaSubject}: ${idea.pitch}`,
              m.prompts.askLine(price),
              "",
              "People:",
              ...batch.map(
                (person, i) =>
                  `  ${i + 1}. ${person.name} — ${person.blurb} ` +
                  `${nonprofit ? "Free time about" : "Budget about"} ${m.unitLabel(person.budget)}. ` +
                  `Habits: ${person.habits.join("; ") || "none given"}`
              ),
            ].join("\n"),
            schema: JudgeOut,
            model: MODELS.fast,
            effort: "low",
            maxTokens: 4096,
          })
    )
  );

  const results: SimResult[] = [];
  let failed = 0;

  settled.forEach((res, b) => {
    const batch = batches[b];
    const verdicts = res.status === "fulfilled" ? res.value.verdicts : [];
    if (res.status === "rejected") {
      failed++;
      console.warn(`[run] batch ${b} failed: ${res.reason}`);
    }

    batch.forEach((p, i) => {
      const v = verdicts[i];
      const partial: SimResult = {
        personaId: p.id,
        // A missing verdict becomes a non-buyer rather than a fabricated sale.
        reason: words(v?.reason ?? "no verdict returned", 8),
        maxPrice: Math.max(0, Math.round(v?.maxPrice ?? 0)),
        tellsFriend: v?.tellsFriend ?? false,
        decision: "leave",
      };
      // decide() owns the rule, not the model — Ethan's price slider re-runs
      // the same function client-side, and the two must never disagree.
      results.push({ ...partial, decision: decide(partial, price) });
    });
  });

  console.log(
    `[run] ${idea.mode ?? "startup"}: judged ${results.length} personas in ${Date.now() - t0}ms` +
      `${failed ? `, ${failed}/${BATCHES} batches failed` : ""}`
  );
  return results;
}

export async function summarise(
  idea: Idea,
  results: SimResult[],
  personas: SimPersona[],
  scene: SceneSpec,
  price: number
): Promise<LaunchSummaryPlus> {
  const m = launchMode(idea.mode);
  const count = (d: SimResult["decision"]) => results.filter((r) => r.decision === d).length;

  // Both of these live in ./summary, shared with the mocks so the two paths
  // cannot drift apart.
  const overallDropOff = dropOffPrice(results);
  const groups = byGroup(results, personas, scene);

  // One fast call groups the leave reasons into three themed objections.
  const leaveReasons = results.filter((r) => r.decision === "leave").map((r) => r.reason);
  let topObjections: LaunchSummary["topObjections"] = [];

  if (leaveReasons.length > 0) {
    try {
      const out = await askJSON({
        system: [
          m.prompts.objectionRule,
          "Each theme: a short text, a count of how many reasons it covers, and the pillar it",
          `belongs to — one of: ${PILLAR_KEYS.join(", ")}.`,
          "The counts must not exceed the number of reasons given.",
        ].join(" "),
        prompt: `Reasons (${leaveReasons.length} people walked away):\n${leaveReasons
          .map((r) => `  - ${r}`)
          .join("\n")}`,
        schema: ObjectionsOut,
        model: MODELS.fast,
        effort: "low",
        maxTokens: 1024,
      });
      topObjections = out.objections.map((o) => ({
        text: words(o.text, 10),
        count: Math.min(leaveReasons.length, Math.max(0, Math.round(o.count))),
        // A protected pillar is redirected, not dropped: an Open House
        // objection the model filed under Funding is really about how the
        // programme runs, and the founder should still see it.
        pillar: remap(asPillar(o.pillar), m),
      }));
    } catch (err) {
      console.warn(`[run] objection grouping failed: ${err}`);
    }
  }

  return {
    price,
    buy: count("buy"),
    curious: count("curious"),
    leave: count("leave"),
    dropOffPrice: overallDropOff,
    byGroup: groups,
    topObjections,
  };
}

/** The plan's summary -> TreeUpdate[] mapping. */
export function toUpdates(idea: Idea, summary: LaunchSummaryPlus, results: SimResult[]): TreeUpdate[] {
  const at = Date.now();
  const m = launchMode(idea.mode);
  const nonprofit = idea.mode === "nonprofit";
  const total = Math.max(1, summary.buy + summary.curious + summary.leave);
  const buyRate = Math.round((summary.buy / total) * 100);
  const updates: TreeUpdate[] = [];

  const active = (p: PillarKey) =>
    idea.choices.filter((c) => c.pillar === p && c.status === "active");
  const top = (p: PillarKey) =>
    [...active(p)].sort((a, b) => b.confidence - a.confidence)[0];

  // Uptake: Revenue on Launch Day, Program at an Open House. Whether 31
  // neighbours can spare four hours a month is evidence about the programme,
  // and says nothing at all about whether a grant renews.
  const rate = top(remap(m.ratePillar, m));
  if (rate) {
    // The action has to follow the number. 5 of 100 joining is a weaken with
    // a negative delta, not a "strengthen" that quietly subtracts 12 — Ethan's
    // tree draws the two differently, and the arrow must match the movement.
    const delta = Math.round((buyRate - 40) / 3);
    updates.push({
      action: delta < 0 ? "weaken" : "strengthen",
      choiceId: rate.id,
      delta,
      reason: nonprofit
        ? `Open House uptake at ${m.unitLabel(summary.price)}.`
        : `Launch Day conversion at $${summary.price}.`,
      quote: `${summary.buy} of ${total} would ${nonprofit ? "give" : "pay"} ${m.unitLabel(summary.price)}`,
      source: "launch",
      at,
    });
  }

  // Customer: the best-converting group, and the price it stops at.
  //
  // The name, not the id: this sentence is read by a founder, and
  // "volunteer-and-staff-tuto converted best" is the slug leaking onto the
  // screen. The drop-off rides along because the rate alone does not say
  // whether the group is cheap to win or simply willing.
  const best = bestGroup(summary.byGroup);
  if (best) {
    const groupName = idea.choices.find(
      (c) => c.pillar === "customer" && c.status === "active"
    );
    if (groupName) {
      const stops =
        best.dropOffPrice > 0 ? ` They stop at ${m.unitLabel(best.dropOffPrice)}.` : "";
      updates.push({
        action: "strengthen",
        choiceId: groupName.id,
        delta: 8,
        reason: `${best.name} converted best at ${best.buyRate}%.${stops}`,
        quote: `${best.size} of ${total} were ${best.name}`,
        source: "launch",
        at,
      });
    }
  }

  // Objections: each one weakens the first active choice in its pillar.
  for (const o of summary.topObjections) {
    const target = active(remap(o.pillar, m))[0];
    if (!target) continue;
    updates.push({
      action: "weaken",
      choiceId: target.id,
      delta: -6,
      reason: o.text,
      quote: `${o.count} people said this`,
      source: "launch",
      at,
    });
  }

  // Reach: word of mouth.
  const reach = top("reach");
  if (reach) {
    const tellRate = Math.round(
      (results.filter((r) => r.tellsFriend).length / Math.max(1, results.length)) * 100
    );
    updates.push({
      action: tellRate >= 30 ? "strengthen" : "weaken",
      choiceId: reach.id,
      delta: Math.round((tellRate - 30) / 4),
      reason: `${tellRate}% said they would tell a friend.`,
      source: "launch",
      at,
    });
  }

  return updates;
}
