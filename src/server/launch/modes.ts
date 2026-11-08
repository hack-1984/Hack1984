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
  /** Which choice each of the three launch updates aims at. */
  targets: { rate: string; group: string; wordOfMouth: string };
  /** How a budget reads in this mode, for quotes. */
  unitLabel: (n: number) => string;
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
  unitLabel: (n) => `$${n}`,
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
  unitLabel: (n) => `${n} hrs/month`,
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
