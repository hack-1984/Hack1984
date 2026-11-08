import type { LaunchSummary, SceneSpec, SimPersona, SimResult } from "@/lib/types";

/**
 * Per-group numbers for a Launch Day or Open House run.
 *
 * `LaunchSummary.byGroup` ships `{ groupId, buyRate }` and lives in
 * src/lib/types.ts, which nobody edits. So the extra fields are declared
 * here instead and widened onto byGroup below. Everything is additive:
 * anything written against LaunchSummary still typechecks and still finds
 * groupId and buyRate exactly where they were.
 */
export interface GroupDropOff {
  groupId: string;
  /** The scene's own label, so a reason can say "Plant Gift Givers", not "plant-gift-give". */
  name: string;
  buyRate: number;
  /**
   * What this group would actually pay — the median of their maxPrice,
   * ignoring the people who would not pay anything.
   *
   * One number per group is the whole point. A single figure across all 100
   * hides the shape that matters: beginners capping at $12 while collectors
   * go to $40 is not the same business as everyone agreeing on $26, and the
   * founder cannot see the difference from a conversion rate alone.
   */
  dropOffPrice: number;
  /** How many of the 100 this group is, so a rate off 3 people reads as one. */
  size: number;
}

/** The shipped summary, with the richer byGroup. */
export interface LaunchSummaryPlus extends Omit<LaunchSummary, "byGroup"> {
  byGroup: GroupDropOff[];
}

/**
 * The price at which half of the people who would pay anything have dropped out.
 *
 * Zeroes are left out on purpose: someone who would never pay is not evidence
 * about price, and including them drags the median toward zero as soon as a
 * run has more leavers than buyers — which is most runs.
 */
export function dropOffPrice(results: SimResult[]): number {
  const paying = results
    .map((r) => r.maxPrice)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);

  if (paying.length === 0) return 0;
  const mid = Math.floor(paying.length / 2);
  return paying.length % 2
    ? paying[mid]
    : Math.round((paying[mid - 1] + paying[mid]) / 2);
}

/**
 * Split the run by scene group.
 *
 * Shared by the live path and the mocks so the two cannot drift: a shape the
 * client only sees under MOCK_AI is a shape nobody has really tested.
 */
export function byGroup(
  results: SimResult[],
  personas: SimPersona[],
  scene: SceneSpec
): GroupDropOff[] {
  const groupOf = new Map(personas.map((p) => [p.id, p.groupId]));

  return scene.groups.map((g) => {
    const inGroup = results.filter((r) => groupOf.get(r.personaId) === g.id);
    const buys = inGroup.filter((r) => r.decision === "buy").length;
    return {
      groupId: g.id,
      name: g.name,
      buyRate: inGroup.length === 0 ? 0 : Math.round((buys / inGroup.length) * 100),
      dropOffPrice: dropOffPrice(inGroup),
      size: inGroup.length,
    };
  });
}

/**
 * The group worth naming in a tree update: the best converter, with ties
 * broken by how many people it speaks for.
 *
 * A 100% rate off two people is not a finding, and sorting on rate alone
 * would let one of those win the headline over a group of fifty.
 */
export function bestGroup(groups: GroupDropOff[]): GroupDropOff | undefined {
  return [...groups].sort((a, b) => b.buyRate - a.buyRate || b.size - a.size)[0];
}
