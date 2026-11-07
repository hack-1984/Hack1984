import { decide } from "@/lib/decide";
import type {
  LaunchSummary,
  PillarKey,
  SceneSpec,
  SimPersona,
  SimResult,
  TreeUpdate,
} from "@/lib/types";

/** Deterministic pseudo-random, so mock runs are reproducible across requests. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 0xffffffff);
}

export const MOCK_SCENE: SceneSpec = {
  center: { label: "Bite forecast app", icon: "Fish" },
  groups: [
    { id: "weekend", name: "Weekend anglers", figure: "person", count: 70, color: "teal" },
    { id: "charter", name: "Charter captains", figure: "company", count: 30, color: "amber" },
  ],
  verbs: { buy: "subscribes", curious: "bookmarks it", leave: "walks past" },
};

const FIRST = ["Dana", "Marcus", "Priya", "Tom", "Alina", "Rafael", "Jo", "Hannah", "Diego", "Kate"];
const LAST = ["Reed", "Okafor", "Nowak", "Silva", "Byrne", "Haddad", "Lin", "Moretti", "Clark", "Osei"];

/** Personas spread across groups in proportion to each group's count. */
export function mockPersonas(scene: SceneSpec = MOCK_SCENE): SimPersona[] {
  const rand = rng(42);
  const out: SimPersona[] = [];

  for (const g of scene.groups) {
    for (let i = 0; i < g.count; i++) {
      const n = out.length;
      const isCompany = g.figure === "company";
      out.push({
        id: `p-${n + 1}`,
        groupId: g.id,
        name: `${FIRST[n % FIRST.length]} ${LAST[(n * 7) % LAST.length]}`,
        blurb: isCompany
          ? "Runs charters most weekends and defends every spot to paying clients."
          : "Fishes a few weekends a year and hates driving an hour for nothing.",
        budget: isCompany ? 40 + Math.floor(rand() * 60) : 5 + Math.floor(rand() * 15),
        habits: isCompany
          ? ["checks tides daily", "books clients a week ahead"]
          : ["fishes on Saturdays", "asks the bait shop"],
        sourceUrl: "https://reddit.com/r/fishing/2",
      });
    }
  }
  return out;
}

/** Decisions come from decide(), so the mock agrees with Ethan's price slider. */
export function mockResults(personas: SimPersona[], price: number): SimResult[] {
  const rand = rng(7);
  return personas.map((p) => {
    const maxPrice = rand() < 0.25 ? 0 : Math.round(p.budget * (0.3 + rand() * 0.7));
    const partial: SimResult = {
      personaId: p.id,
      decision: "leave",
      reason: maxPrice === 0 ? "would never pay for this" : "price close but too high",
      maxPrice,
      tellsFriend: rand() < 0.35,
    };
    return { ...partial, decision: decide(partial, price) };
  });
}

export function summarise(
  results: SimResult[],
  personas: SimPersona[],
  scene: SceneSpec,
  price: number
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
    topObjections: [
      { text: "Too expensive for how often I fish", count: 22, pillar: "revenue" as PillarKey },
      { text: "Not sure the forecast is accurate", count: 14, pillar: "risks" as PillarKey },
      { text: "Already get this from a friend", count: 9, pillar: "edge" as PillarKey },
    ],
  };
}

/** The plan's summary -> TreeUpdate[] mapping, in mock form. */
export function mockUpdates(summary: LaunchSummary): TreeUpdate[] {
  const at = Date.now();
  const total = Math.max(1, summary.buy + summary.curious + summary.leave);
  const buyRate = Math.round((summary.buy / total) * 100);
  const best = [...summary.byGroup].sort((a, b) => b.buyRate - a.buyRate)[0];

  return [
    {
      action: "strengthen",
      choiceId: "rev-1",
      delta: Math.round((buyRate - 40) / 3),
      reason: "Launch Day conversion at this price.",
      quote: `${summary.buy} of ${total} would pay $${summary.price}`,
      source: "launch",
      at,
    },
    {
      action: "strengthen",
      choiceId: "cus-1",
      delta: 8,
      reason: `Best converting group: ${best?.groupId ?? "unknown"} at ${best?.buyRate ?? 0}%.`,
      source: "launch",
      at,
    },
    {
      action: "weaken",
      choiceId: "rev-1",
      delta: -6,
      reason: summary.topObjections[0].text,
      source: "launch",
      at,
    },
  ];
}
