import { decide } from "@/lib/decide";
import type {
  LaunchSummary,
  Mode,
  SceneSpec,
  SimPersona,
  SimResult,
  TreeUpdate,
} from "@/lib/types";
import { NONPROFIT_PERSONAS, NONPROFIT_REASONS, launchMode } from "./modes";

/** Deterministic pseudo-random, so mock runs are reproducible across requests. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

/** Launch Day's scene. Kept as a named export: other modules import it. */
export const MOCK_SCENE: SceneSpec = launchMode("startup").scene;

/** The scene for a mode — Launch Day's boat ramp or Open House's school. */
export function mockScene(mode?: Mode): SceneSpec {
  return launchMode(mode).scene;
}

const FIRST = ["Dana", "Marcus", "Priya", "Tom", "Alina", "Rafael", "Jo", "Hannah", "Diego", "Kate"];
const LAST = ["Reed", "Okafor", "Nowak", "Silva", "Byrne", "Haddad", "Lin", "Moretti", "Clark", "Osei"];

/**
 * Personas spread across groups in proportion to each group's count.
 *
 * `budget` carries the mode's unit: dollars they could spend on Launch Day,
 * hours free per month at an Open House. `habits` likewise — buying habits for
 * one, schedule limits for the other.
 */
export function mockPersonas(scene: SceneSpec = MOCK_SCENE, mode?: Mode): SimPersona[] {
  const rand = rng(42);
  const out: SimPersona[] = [];
  const nonprofit = mode === "nonprofit";

  for (const g of scene.groups) {
    for (let i = 0; i < g.count; i++) {
      const n = out.length;
      const isCompany = g.figure === "company";
      const np = nonprofit ? NONPROFIT_PERSONAS[g.id] : undefined;

      out.push({
        id: `p-${n + 1}`,
        groupId: g.id,
        name: `${FIRST[n % FIRST.length]} ${LAST[(n * 7) % LAST.length]}`,
        blurb: np
          ? np.blurb
          : isCompany
            ? "Runs charters most weekends and defends every spot to paying clients."
            : "Fishes a few weekends a year and hates driving an hour for nothing.",
        budget: np
          ? np.hours[0] + Math.floor(rand() * (np.hours[1] - np.hours[0]))
          : isCompany
            ? 40 + Math.floor(rand() * 60)
            : 5 + Math.floor(rand() * 15),
        habits: np
          ? np.habits
          : isCompany
            ? ["checks tides daily", "books clients a week ahead"]
            : ["fishes on Saturdays", "asks the bait shop"],
        sourceUrl: nonprofit ? "https://reddit.com/r/boston/3" : "https://reddit.com/r/fishing/2",
      });
    }
  }
  return out;
}

/** Decisions come from decide(), so the mock agrees with Ethan's price slider. */
export function mockResults(personas: SimPersona[], price: number, mode?: Mode): SimResult[] {
  const rand = rng(7);
  const nonprofit = mode === "nonprofit";

  return personas.map((p) => {
    const maxPrice = rand() < 0.25 ? 0 : Math.round(p.budget * (0.3 + rand() * 0.7));
    const partial: SimResult = {
      personaId: p.id,
      decision: "leave",
      reason: nonprofit
        ? maxPrice === 0
          ? NONPROFIT_REASONS.never
          : NONPROFIT_REASONS.close
        : maxPrice === 0
          ? "would never pay for this"
          : "price close but too high",
      maxPrice,
      tellsFriend: rand() < 0.35,
    };
    const decision = decide(partial, price);
    return {
      ...partial,
      decision,
      reason: nonprofit && decision === "buy" ? NONPROFIT_REASONS.join : partial.reason,
    };
  });
}

export function summarise(
  results: SimResult[],
  personas: SimPersona[],
  scene: SceneSpec,
  price: number,
  mode?: Mode
): LaunchSummary {
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
    return {
      groupId: g.id,
      buyRate: inGroup.length === 0 ? 0 : Math.round((buys / inGroup.length) * 100),
    };
  });

  return {
    price,
    buy: count("buy"),
    curious: count("curious"),
    leave: count("leave"),
    dropOffPrice,
    byGroup,
    topObjections: launchMode(mode).objections,
  };
}

/**
 * The plan's summary -> TreeUpdate[] mapping, in mock form.
 *
 * In nonprofit mode these aim at Program, People served and Outreach, and
 * never at Funding: whether 31 neighbours can spare four hours says nothing
 * about whether a grant renews.
 */
export function mockUpdates(summary: LaunchSummary, mode?: Mode): TreeUpdate[] {
  const at = Date.now();
  const m = launchMode(mode);
  const total = Math.max(1, summary.buy + summary.curious + summary.leave);
  const joinRate = Math.round((summary.buy / total) * 100);
  const best = [...summary.byGroup].sort((a, b) => b.buyRate - a.buyRate)[0];
  const nonprofit = mode === "nonprofit";

  return [
    {
      action: "strengthen",
      choiceId: m.targets.rate,
      delta: Math.round((joinRate - 40) / 3),
      reason: nonprofit
        ? "Open House uptake at the hours asked."
        : "Launch Day conversion at this price.",
      quote: `${summary.buy} of ${total} would ${nonprofit ? "give" : "pay"} ${m.unitLabel(summary.price)}`,
      source: "launch",
      at,
    },
    {
      action: "strengthen",
      choiceId: m.targets.group,
      delta: 8,
      reason: `Best ${nonprofit ? "joining" : "converting"} group: ${best?.groupId ?? "unknown"} at ${best?.buyRate ?? 0}%.`,
      source: "launch",
      at,
    },
    {
      action: "weaken",
      // An objection lands on its own pillar, except one the mode protects:
      // a money objection in nonprofit mode is really about how it runs.
      choiceId: nonprofit ? m.targets.wordOfMouth : m.targets.rate,
      delta: -6,
      reason: summary.topObjections[0].text,
      source: "launch",
      at,
    },
  ];
}
