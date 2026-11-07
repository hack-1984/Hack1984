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

const BATCHES = 10;

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

/** Ask the model what each persona would pay; decide buy/curious/leave in code. */
export async function judge(
  idea: Idea,
  personas: SimPersona[],
  price: number
): Promise<SimResult[]> {
  const t0 = Date.now();
  const batches = chunk(personas, BATCHES);

  const settled = await Promise.allSettled(
    batches.map((batch) =>
      batch.length === 0
        ? Promise.resolve({ verdicts: [] })
        : askJSON({
            system: [
              "You judge whether each person would buy a product at a given price.",
              "For each, give: reason (at most 8 words, in their voice),",
              "maxPrice — the most they would actually pay per month, 0 if they would never pay —",
              "and tellsFriend. Be harsh: most people do not buy. Respect their stated budget.",
              "Return one verdict per person, in the order given.",
            ].join(" "),
            prompt: [
              `Product: ${idea.pitch}`,
              `Asking price: $${price} per month`,
              "",
              "People:",
              ...batch.map(
                (p, i) =>
                  `  ${i + 1}. ${p.name} — ${p.blurb} Budget about $${p.budget}. Habits: ${
                    p.habits.join("; ") || "none given"
                  }`
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
    `[run] judged ${results.length} personas in ${Date.now() - t0}ms` +
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
): Promise<LaunchSummary> {
  const count = (d: SimResult["decision"]) => results.filter((r) => r.decision === d).length;

  const nonZero = results
    .map((r) => r.maxPrice)
    .filter((m) => m > 0)
    .sort((a, b) => a - b);
  const mid = Math.floor(nonZero.length / 2);
  const dropOffPrice =
    nonZero.length === 0
      ? 0
      : nonZero.length % 2
        ? nonZero[mid]
        : Math.round((nonZero[mid - 1] + nonZero[mid]) / 2);

  const groupOf = new Map(personas.map((p) => [p.id, p.groupId]));
  const byGroup = scene.groups.map((g) => {
    const inGroup = results.filter((r) => groupOf.get(r.personaId) === g.id);
    const buys = inGroup.filter((r) => r.decision === "buy").length;
    return { groupId: g.id, buyRate: inGroup.length === 0 ? 0 : Math.round((buys / inGroup.length) * 100) };
  });

  // One fast call groups the leave reasons into three themed objections.
  const leaveReasons = results.filter((r) => r.decision === "leave").map((r) => r.reason);
  let topObjections: LaunchSummary["topObjections"] = [];

  if (leaveReasons.length > 0) {
    try {
      const out = await askJSON({
        system: [
          "You group reasons people walked away into at most three themes.",
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
        pillar: asPillar(o.pillar),
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
    dropOffPrice,
    byGroup,
    topObjections,
  };
}

/** The plan's summary -> TreeUpdate[] mapping. */
export function toUpdates(idea: Idea, summary: LaunchSummary, results: SimResult[]): TreeUpdate[] {
  const at = Date.now();
  const total = Math.max(1, summary.buy + summary.curious + summary.leave);
  const buyRate = Math.round((summary.buy / total) * 100);
  const updates: TreeUpdate[] = [];

  const active = (p: PillarKey) =>
    idea.choices.filter((c) => c.pillar === p && c.status === "active");
  const top = (p: PillarKey) =>
    [...active(p)].sort((a, b) => b.confidence - a.confidence)[0];

  // Revenue: conversion at this price.
  const revenue = top("revenue");
  if (revenue) {
    updates.push({
      action: "strengthen",
      choiceId: revenue.id,
      delta: Math.round((buyRate - 40) / 3),
      reason: `Launch Day conversion at $${summary.price}.`,
      quote: `${summary.buy} of ${total} would pay $${summary.price}`,
      source: "launch",
      at,
    });
  }

  // Customer: the best-converting group.
  const best = [...summary.byGroup].sort((a, b) => b.buyRate - a.buyRate)[0];
  if (best) {
    const groupName = idea.choices.find(
      (c) => c.pillar === "customer" && c.status === "active"
    );
    if (groupName) {
      updates.push({
        action: "strengthen",
        choiceId: groupName.id,
        delta: 8,
        reason: `${best.groupId} converted best at ${best.buyRate}%.`,
        source: "launch",
        at,
      });
    }
  }

  // Objections: each one weakens the first active choice in its pillar.
  for (const o of summary.topObjections) {
    const target = active(o.pillar)[0];
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
