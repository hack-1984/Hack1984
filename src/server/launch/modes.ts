import type { Mode, PillarKey, SceneSpec } from "@/lib/types";

/**
 * Every mode-specific constant and prompt for Launch Day / Open House.
 *
 * Launch Day asks 100 people whether they would pay a price. A nonprofit
 * programme is usually free, so the real barrier is time: Open House asks 100
 * community members whether they would give the hours the programme asks each
 * month. Same routes, same shapes, same decide() — only the meaning of the
 * numbers changes.
 */

export interface LaunchMode {
  /** Fallback scene when the model call fails. */
  scene: SceneSpec;
  /** Objections the mock reports, highest count first. */
  objections: { text: string; count: number; pillar: PillarKey }[];
  /** Pillars a launch update may never touch, and where such an update goes. */
  neverUpdate: PillarKey[];
  remapTo: PillarKey;
  /** Which choice each of the three launch updates aims at. Mocks only. */
  targets: { rate: string; group: string; wordOfMouth: string };
  /** Which pillar the headline uptake update lands on, on the real path. */
  ratePillar: PillarKey;
  /** How a budget reads in this mode, for quotes. */
  unitLabel: (n: number) => string;
  /** Everything the three live calls say differently. */
  prompts: {
    sceneRules: string[];
    sceneSubject: string;
    sceneIcons: string;
    personaRules: string[];
    personaSubject: string;
    budgetMeans: string;
    judgeRules: string[];
    askLine: (n: number) => string;
    objectionRule: string;
  };
}

/** Launch Day: dollars. */
const STARTUP: LaunchMode = {
  scene: {
    center: { label: "Bite forecast app", icon: "Fish" },
    groups: [
      { id: "weekend", name: "Weekend anglers", figure: "person", count: 70, color: "teal" },
      { id: "charter", name: "Charter captains", figure: "company", count: 30, color: "amber" },
    ],
    verbs: { buy: "subscribes", curious: "bookmarks it", leave: "walks past" },
  },
  objections: [
    { text: "Too expensive for how often I fish", count: 22, pillar: "revenue" },
    { text: "Not sure the forecast is accurate", count: 14, pillar: "risks" },
    { text: "Already get this from a friend", count: 9, pillar: "edge" },
  ],
  neverUpdate: [],
  remapTo: "approach",
  targets: { rate: "rev-1", group: "cus-1", wordOfMouth: "rea-1" },
  ratePillar: "revenue",
  unitLabel: (n) => `$${n}`,
  prompts: {
    sceneRules: [
      "1 to 3 customer groups. If the buyers are businesses, figure is 'company' and the",
      "total across groups is about 20-30. If they are consumers, figure is 'person' and",
      "the total is about 100. Counts must sum to that total.",
    ],
    sceneSubject: "Customer bets",
    sceneIcons: "e.g. Fish, Store, Truck, Laptop",
    personaRules: [
      "You invent realistic potential customers for a launch-day simulation.",
      "A 'company' figure is a buyer at a business, so its budget is a business budget.",
      "Vary them: not everyone is enthusiastic and not everyone can afford it.",
    ],
    personaSubject: "Product",
    budgetMeans: "a budget in dollars they could spend on this per month",
    judgeRules: [
      "You judge whether each person would buy a product at a given price.",
      "For each, give: reason (at most 8 words, in their voice),",
      "maxPrice — the most they would actually pay per month, 0 if they would never pay —",
      "and tellsFriend. Be harsh: most people do not buy. Respect their stated budget.",
    ],
    askLine: (n) => `Asking price: $${n} per month`,
    objectionRule: "You group reasons people walked away into at most three themes.",
  },
};

/**
 * Open House: hours per month.
 *
 * The three groups are drawn from CodeCorner's People served choices plus the
 * volunteers its Approach leans on — 60 / 25 / 15, about 100 in all.
 */
const NONPROFIT: LaunchMode = {
  scene: {
    center: { label: "After-school coding club", icon: "HeartHandshake" },
    groups: [
      { id: "students", name: "Middle schoolers", figure: "person", count: 60, color: "teal" },
      { id: "caregivers", name: "Caregivers", figure: "person", count: 25, color: "purple" },
      { id: "mentors", name: "Volunteer mentors", figure: "person", count: 15, color: "amber" },
    ],
    verbs: { buy: "joins", curious: "maybe", leave: "walks away" },
  },
  // About fit and time, never about price: the programme is free.
  objections: [
    { text: "Bus stops running before pickup", count: 19, pillar: "approach" },
    { text: "Clashes with homework and dinner", count: 12, pillar: "solution" },
    { text: "Never heard the programme existed", count: 8, pillar: "reach" },
  ],
  // Community uptake says nothing about whether a grant renews.
  neverUpdate: ["revenue"],
  remapTo: "approach",
  targets: { rate: "sol-1", group: "cus-1", wordOfMouth: "rea-1" },
  // Uptake is evidence about the Programme, not about the Funding.
  ratePillar: "solution",
  unitLabel: (n) => `${n} hrs/month`,
  prompts: {
    sceneRules: [
      "The groups are the people this programme serves, plus the volunteers or staff who run it.",
      "Exactly 3 groups where possible, every figure 'person', about 100 people in total:",
      "the people served first and largest, then whoever decides for them when they are children",
      "or dependents, then the volunteers or staff — the smallest group. Counts must sum to about 100.",
      "The groups must not overlap: never split the same people twice by different attributes.",
    ],
    sceneSubject: "People served",
    sceneIcons: "e.g. HeartHandshake, Users, BookOpen, Soup, Sprout",
    personaRules: [
      "You invent realistic community members for an open house at a free local programme.",
      "These people are not customers and nothing is for sale — what they are deciding is",
      "whether to give their time. Include people who want to come but cannot.",
      "Vary them: shift work, caring for someone else, no transport, already overcommitted.",
    ],
    personaSubject: "Programme",
    // "Hours they could give" reads as volunteering, so a parent deciding for
    // a child answered 0 and the whole scene emptied out. Say whose hours.
    budgetMeans:
      "the number of hours a month they could realistically spend at this programme — their own hours if they attend or volunteer, the child's hours if they are deciding for a child",
    judgeRules: [
      "You judge whether each person would commit a number of hours a month to a free programme.",
      "For each, give: reason (at most 8 words, in their voice),",
      "maxPrice — the most hours a month they would actually spend there, counting the child's",
      "hours when they are deciding for a child, and 0 only if they would not come at all —",
      "and tellsFriend. Be harsh: most people do not turn up. Respect their stated hours.",
      "The programme is free, so never give price or cost as a reason. Reasons are about",
      "time, transport, scheduling, trust and whether it fits their life.",
    ],
    askLine: (n) => `Hours asked: ${n} hours per month`,
    objectionRule:
      "You group reasons people did not join into at most three themes. The programme is free, so no theme is about price.",
  },
};

const MODES: Record<Mode, LaunchMode> = { startup: STARTUP, nonprofit: NONPROFIT };

/** The launch profile for a mode. Undefined means startup. */
export function launchMode(mode?: Mode): LaunchMode {
  return MODES[mode ?? "startup"];
}

/** Names and schedule limits for Open House personas, by group. */
export const NONPROFIT_PERSONAS: Record<
  string,
  { blurb: string; habits: string[]; hours: [number, number] }
> = {
  students: {
    blurb: "A seventh grader at one of the two schools, with nowhere to be between 3pm and 6pm.",
    habits: ["walks home alone", "no ride after 5pm"],
    hours: [2, 12],
  },
  caregivers: {
    blurb: "Works shifts and decides whether the kid comes back next week.",
    habits: ["second shift", "younger sibling to collect"],
    hours: [1, 8],
  },
  mentors: {
    blurb: "A college student or local engineer who could run a session or two a week.",
    habits: ["class until 4pm", "needs a CORI check"],
    hours: [2, 16],
  },
};

/** Why someone walks away from a free programme: fit or time, ≤ 8 words. */
export const NONPROFIT_REASONS = {
  never: "no free hours in the week",
  close: "wants to but timing is tight",
  join: "fits right after dismissal",
};
