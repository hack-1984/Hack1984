import { z } from "zod";
import type { Mode, PillarKey } from "@/lib/types";

/**
 * Every prompt that differs between startup and nonprofit research.
 *
 * gather.ts and generateTree.ts keep ONE code path and pick a profile here.
 * Nothing in this file touches shapes: both modes produce the same
 * ResearchBundle and the same eight pillars, because Ethan's tree and Greg's
 * drawer are written against those shapes and must not care which mode is on.
 *
 * The five query slots keep their startup names, since they are internal keys
 * on a fixed schema. What each one MEANS is mode-specific:
 *
 *   slot          startup              nonprofit
 *   ------------  -------------------  --------------------------------
 *   competitors   direct competitors   peer organizations doing this work
 *   pricing       what rivals charge   funders and grant programmes
 *   complaints    people complaining   community voices on the need
 *   marketSize    market size          statistics showing the need
 *   news          sector news          policy and funding news
 */

/** The five slots that become web searches, in order. */
export const QUERY_KEYS = [
  "competitors",
  "pricing",
  "complaints",
  "marketSize",
  "news",
] as const;

export type QueryKey = (typeof QUERY_KEYS)[number];

/**
 * One schema for both modes.
 *
 * `causeTerms` is asked for in nonprofit mode only — it feeds the ProPublica
 * Explorer, which matches organization NAMES, so it wants two or three plain
 * words ("youth coding education"), not a sentence. Optional, because the
 * startup prompt never mentions it and a model that omits it is correct.
 */
export const Queries = z.object({
  competitors: z.string(),
  pricing: z.string(),
  complaints: z.string(),
  marketSize: z.string(),
  news: z.string(),
  causeTerms: z.string().optional(),
});

export type QuerySet = z.infer<typeof Queries>;

export interface ResearchMode {
  mode: Mode;
  /** System prompt for the query writer. */
  querySystem: string;
  /** The bullet list describing each slot, shown to the query writer. */
  queryLines: string[];
  /** Used when the query-writing call fails outright. */
  fallbackQueries: (pitch: string) => QuerySet;
  /** Extra rules for the extraction call, on top of the shared ones. */
  extractRules: string[];
  /** What the extraction call is asked to pull out. */
  extractTask: string;
  /** First line of the tree-generation system prompt. */
  treeIntro: (pillars: string) => string;
  /** Mode-specific rules appended to the tree-generation system prompt. */
  treeRules: string[];
  /** Pillars whose confidence gets a hard ceiling, with the reason why. */
  caps: { pillar: PillarKey; max: number; when: string }[];
}

const STARTUP: ResearchMode = {
  mode: "startup",
  querySystem:
    "You write web search queries for researching a startup idea. Each query is a plain search string, no operators, no quotes.",
  queryLines: [
    "- competitors: direct competitors to this product",
    "- pricing: what alternatives charge",
    "- complaints: people complaining about this problem (include the word reddit)",
    "- marketSize: how big this market is",
    "- news: recent news in this space",
  ],
  fallbackQueries: (pitch) => ({
    competitors: `${pitch} competitors`,
    pricing: `${pitch} pricing`,
    complaints: `${pitch} problem reddit complaints`,
    marketSize: `${pitch} market size`,
    news: `${pitch} news`,
  }),
  extractRules: ["A complaint must quote what a real person actually wrote, with their link."],
  extractTask: "Extract up to 6 competitors, up to 8 complaints, and up to 5 market notes.",
  treeIntro: (pillars) =>
    `You map a startup pitch onto these pillars, as a tree of specific bets: ${pillars}.`,
  treeRules: [],
  caps: [],
};

/**
 * Nonprofit research.
 *
 * The questions a founder has to answer are genuinely different, not startup
 * questions with the nouns swapped. Who pays is not who benefits; "market
 * size" is a documented need; and the single fact that best predicts whether
 * a small nonprofit is still running in three years is whether its money
 * comes from more than one place. That last one is why `caps` exists.
 */
const NONPROFIT: ResearchMode = {
  mode: "nonprofit",
  querySystem:
    "You write web search queries for researching a nonprofit mission. Each query is a plain search string, no operators, no quotes. Never write queries about profit, customers or market share.",
  queryLines: [
    "- competitors: existing nonprofits or programmes already doing this work, and where",
    "- pricing: foundations, government programmes and grants that fund work like this",
    "- complaints: what people in this community actually say about the need (include the word reddit)",
    "- marketSize: statistics or reports showing how many people have this need",
    "- news: recent policy, funding or closure news affecting this kind of organization",
    "- causeTerms: two or three plain words naming the cause, the way an organization",
    "  would put them in its own name (for example: youth coding education, food pantry,",
    "  river conservation). No place names, no filler words.",
  ],
  fallbackQueries: (pitch) => ({
    competitors: `nonprofit organizations ${pitch}`,
    pricing: `grants funding ${pitch}`,
    complaints: `${pitch} community need reddit`,
    marketSize: `${pitch} statistics need report`,
    news: `${pitch} nonprofit funding news`,
    causeTerms: pitch.split(/\s+/).slice(0, 3).join(" "),
  }),
  extractRules: [
    "A competitor here is a PEER ORGANIZATION already serving this need, not a rival to beat.",
    "A complaint here is a COMMUNITY VOICE: what someone affected by this need actually wrote, with their link.",
    "A market note here is evidence of NEED or of how this work gets funded.",
  ],
  extractTask:
    "Extract up to 6 peer organizations, up to 8 community voices, and up to 5 notes on the need and how it is funded.",
  treeIntro: (pillars) =>
    `You map a nonprofit mission onto these pillars, as a tree of specific commitments: ${pillars}.`,
  treeRules: [
    "This is a nonprofit. Never write about customers, profit, market share or revenue growth.",
    "customer (People served): name a specific group in a specific place, not a demographic bracket.",
    "problem (Need): say who is going without what, and cite the evidence for it.",
    "solution (Program): name the activities that actually happen — sessions, meals, visits — not a product.",
    "approach (Approach): cover delivery, who staffs it, and the legal structure — its own 501(c)(3), or a fiscal sponsor.",
    "edge (Why us): access, trust and partners already in place. Not technology and not being first.",
    "revenue (Funding): a funding mix — grants, individual donors, earned income, government contracts. A plan that leans on one source is fragile: give it confidence below 45 and say so in the detail.",
    "risks (Risks): draw from losing the main funder, volunteer churn, mission drift, weak governance, founder dependence, and safeguarding when the programme works with children or vulnerable adults.",
  ],
  // Funding concentration is the thing that closes small nonprofits, so a
  // single-source plan is capped no matter how confident the model sounded.
  caps: [{ pillar: "revenue", max: 44, when: "single-source funding" }],
};

const MODES: Record<Mode, ResearchMode> = { startup: STARTUP, nonprofit: NONPROFIT };

/** The research profile for a mode. Undefined means startup. */
export function researchMode(mode?: Mode): ResearchMode {
  return MODES[mode ?? "startup"];
}

/** The distinct ways a nonprofit can be funded. Two or more is a mix. */
const FUNDING_SOURCES: { name: string; re: RegExp }[] = [
  { name: "grants", re: /\b(grant|grants|foundation|philanthrop)/ },
  { name: "individuals", re: /\b(individual|donor|donation|giving|crowdfund|membership|major gift)/ },
  { name: "earned", re: /\b(earned income|fee|fees|tuition|ticket|sales|contract work|social enterprise)/ },
  { name: "government", re: /\b(government|municipal|city|state|federal|public funding|contract)/ },
  { name: "corporate", re: /\b(corporate|sponsor|business partner|employer)/ },
  { name: "events", re: /\b(event|gala|fundrais(er|ing event)|auction|drive)/ },
];

/** Words that say "one source" outright, whatever else the text lists. */
const CONCENTRATED =
  /\b(one|single|sole|only|primary|anchor|main|chief)\s+(\w+\s+){0,2}(foundation|grant|funder|donor|contract|sponsor|source)\b|\brel(y|ies|ying)\s+(entirely|solely|wholly)?\s*on\b|\bdepends? (entirely|solely|wholly) on\b/;

/** Words that say "a mix" outright. */
const DIVERSIFIED = /\b(mix|mixed|diversif\w*|blend\w*|multiple|several|combination|three|four|balanced)\b/;

/**
 * Does this funding choice rest on a single source?
 *
 * Text-based on purpose. The plan's rule is about what the tree SAYS to the
 * founder reading it — there is no honest structured field to read, since the
 * model writes the funding plan as prose, and a plan that reads as "one
 * family foundation" is fragile no matter what number was attached to it.
 *
 * Order matters: "one anchor funder plus small donors" is concentrated even
 * though it names two things, so the explicit phrasing is checked first.
 */
export function singleSourceFunding(text: string): boolean {
  const t = text.toLowerCase();
  if (CONCENTRATED.test(t)) return true;
  if (DIVERSIFIED.test(t)) return false;
  return FUNDING_SOURCES.filter((s) => s.re.test(t)).length <= 1;
}
