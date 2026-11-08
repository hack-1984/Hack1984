import { FIXTURE_IDEA } from "@/data/fixture-idea";
import { FIXTURE_NONPROFIT } from "@/data/fixture-nonprofit";
import { PILLARS } from "./pillars";
import type { Idea, Mode, PillarKey } from "./types";

/**
 * Every difference between the startup and nonprofit sides, in one file.
 *
 * Specified by Step 0N of the master doc. After Step 0N lands, nobody edits
 * this file — the rest of the work is the same screens and the same routes
 * reading a different profile. If you need an extra field, define a type in
 * your own folder.
 *
 * A missing mode means "startup", so the startup pipeline behaves exactly as
 * it does today.
 */

/** The four persona roles. Same keys in both modes; only the titles change. */
export type RoleKey = "customer" | "competitor" | "investor" | "advisor";

export interface ModeProfile {
  mode: Mode;
  /** Name of the mode itself, for the Startup / Nonprofit switch. */
  label: string;
  /** What the root of the tree is called. */
  rootLabel: string;
  /** Placeholder for the intake box. */
  pitchPlaceholder: string;
  /** The 8 pillars in fixed order, labelled for this mode. */
  pillars: { key: PillarKey; label: string; question: string }[];
  /** Titles for the four persona roles. */
  roles: Record<RoleKey, string>;
  /** What the three ResearchBundle fields are called in this mode. */
  research: { competitors: string; complaints: string; marketNotes: string };
  /** Launch Day / Open House. `price` and `maxPrice` carry `unit`. */
  launch: {
    /** Screen title. */
    title: string;
    /** What the price slider measures. */
    unit: "dollars" | "hours";
    /** Short suffix for rendering a value, e.g. "$8" vs "4 hrs/month". */
    unitShort: string;
    /** Slider default, floor and ceiling. */
    fallback: number;
    min: number;
    max: number;
    /** decide() returns buy/curious/leave; these are the words shown. */
    verbs: { buy: string; curious: string; leave: string };
    /** Fallback scene centre icon (validated against lucide by the route). */
    icon: string;
    /** Pillars a launch update may never touch. */
    neverUpdate: PillarKey[];
    /** Where an update aimed at a `neverUpdate` pillar goes instead. */
    remapTo: PillarKey;
  };
}

const PROFILES: Record<Mode, ModeProfile> = {
  startup: {
    mode: "startup",
    label: "Startup",
    rootLabel: "Pitch",
    pitchPlaceholder: "An app that tells you where the fish are biting today.",
    pillars: PILLARS.map((p) => ({ key: p.key, label: p.startup, question: p.question })),
    roles: {
      customer: "Customer",
      competitor: "Competitor",
      investor: "Investor",
      advisor: "Advisor",
    },
    research: {
      competitors: "Competitors",
      complaints: "Customer complaints",
      marketNotes: "Market notes",
    },
    launch: {
      title: "Launch Day",
      unit: "dollars",
      unitShort: "$",
      fallback: 8,
      min: 0,
      max: 40,
      verbs: { buy: "buys", curious: "curious", leave: "walks past" },
      icon: "Store",
      neverUpdate: [],
      remapTo: "approach",
    },
  },
  nonprofit: {
    mode: "nonprofit",
    label: "Nonprofit",
    rootLabel: "Mission",
    pitchPlaceholder: "A free after-school coding club for middle schoolers in Dorchester.",
    pillars: PILLARS.map((p) => ({ key: p.key, label: p.nonprofit, question: p.question })),
    roles: {
      customer: "Community member",
      competitor: "Peer organization",
      investor: "Funder",
      advisor: "Advisor",
    },
    research: {
      competitors: "Peer organizations",
      complaints: "Community voices",
      marketNotes: "Need and funding notes",
    },
    launch: {
      title: "Open House",
      unit: "hours",
      unitShort: " hrs/month",
      fallback: 4,
      min: 1,
      max: 20,
      verbs: { buy: "joins", curious: "maybe", leave: "walks away" },
      icon: "HeartHandshake",
      // A nonprofit program is free; nobody "joins" harder because of money,
      // so community uptake never moves the Funding pillar.
      neverUpdate: ["revenue"],
      remapTo: "approach",
    },
  },
};

/** The profile for a mode. Undefined means startup. */
export function profileFor(mode?: Mode): ModeProfile {
  return PROFILES[mode ?? "startup"];
}

/** The fixture for a mode, for mocks. Undefined means startup. */
export function fixtureFor(mode?: Mode): Idea {
  return mode === "nonprofit" ? FIXTURE_NONPROFIT : FIXTURE_IDEA;
}

/** Render a slider value in this mode's unit: "$8" or "4 hrs/month". */
export function formatUnit(value: number, mode?: Mode): string {
  const p = profileFor(mode);
  return p.launch.unit === "dollars" ? `$${value}` : `${value}${p.launch.unitShort}`;
}

/**
 * Where a launch update aimed at `pillar` should actually land.
 * In nonprofit mode an objection about money is really about how the program
 * runs, so it is remapped rather than dropped.
 */
export function remapPillar(pillar: PillarKey, mode?: Mode): PillarKey {
  const p = profileFor(mode);
  return p.launch.neverUpdate.includes(pillar) ? p.launch.remapTo : pillar;
}
