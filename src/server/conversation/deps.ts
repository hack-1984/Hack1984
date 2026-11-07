/**
 * The single import surface for Tony's code (conversation, graveyard, build).
 *
 * AI helpers and shared types come from Step 0 (Nick's src/lib/ai and
 * src/lib/types). What's defined here is only what Step 0 doesn't have:
 *   - the 'reply' update source (founder replies to a highlight)
 *   - `ghost` on haunt updates (the dead startup's name)
 *   - the request/response contracts for Tony's routes
 */
import type { TreeUpdate as BaseTreeUpdate, UpdateSource as BaseUpdateSource, PillarKey, Idea } from "@/lib/types";

export { askJSON, MODELS, search } from "@/lib/ai";
export type { Choice, Evidence, Idea, NewChoice, PillarKey } from "@/lib/types";

// ---------- extensions to Step 0 types ----------

/** Step 0's sources plus 'reply' (founder replying to highlighted text). */
export type UpdateSource = BaseUpdateSource | "reply";

/** Step 0's TreeUpdate, plus `ghost` on haunts and the 'reply' source. */
export type TreeUpdate = Omit<BaseTreeUpdate, "source"> & {
  source: UpdateSource;
  ghost?: string;
};

// ---------- contracts for Tony's routes ----------

export type PersonaRole = "customer" | "competitor" | "investor" | "advisor";

export interface Persona {
  id: string;
  role: PersonaRole;
  name: string;
  blurb: string;
  basedOn?: { text: string; url: string; where: string };
}

export interface ChatMessage {
  from: "founder" | "persona";
  text: string;
}

export interface Highlight {
  text: string;
  choiceId?: string;
  pillar?: PillarKey;
}

/** POST /api/persona */
export interface PersonaReq {
  idea: Idea;
  role: PersonaRole;
  choiceId?: string;
}
export interface PersonaRes {
  persona: Persona;
}

/** POST /api/chat — wouldBuy is 0-100 */
export interface ChatReq {
  idea: Idea;
  persona: Persona;
  messages: ChatMessage[];
  focusChoiceId?: string;
  highlight?: Highlight;
}
export interface ChatRes {
  reply: string;
  wouldBuy: number;
}

/** POST /api/extract — messages = only the newest exchange */
export interface ExtractReq {
  idea: Idea;
  messages: ChatMessage[];
  source: UpdateSource;
  persona?: Persona;
  highlight?: Highlight;
}
export interface ExtractRes {
  updates: TreeUpdate[];
}

/** POST /api/graveyard (frozen shape) */
export interface Grave {
  name: string;
  years: string;
  epitaph: string;
  raised?: string;
  similarity: number;
  story: string;
  threatens: PillarKey;
  sources: string[];
  haunt: TreeUpdate;
  learn: TreeUpdate;
}
export interface GraveyardReq {
  idea: Idea;
}
export interface GraveyardRes {
  graves: Grave[];
  adjacent: boolean;
}

/**
 * POST /api/impact — Greg's Build modal, Theory of change tab (nonprofit only in the UI).
 * Same shape as the Step 0N block in the master doc. Once Step 0N lands in
 * src/lib/contracts.ts, replace these three with a re-export from there.
 */
export interface LogicModel {
  inputs: string[]; // resources: team, funding, partners, space
  activities: string[]; // what the program does
  outputs: string[]; // countable: '40 kids attend 2 sessions a week'
  outcomes: string[]; // change in people: 'kids build and ship 3 projects'
  impact: string; // long-term change, one line
  assumptions: { text: string; choiceId?: string }[]; // what must be true; choiceId links it to the tree
  metrics: { label: string; target: string; pillar: PillarKey }[]; // 3 to track
}
export interface ImpactReq {
  idea: Idea;
}
export interface ImpactRes {
  logicModel: LogicModel;
  updates: TreeUpdate[]; // weak assumptions, source 'plan'
}

/** POST /api/build */
export interface BuildReq {
  idea: Idea;
}
export interface BuildRes {
  landing: { headline: string; subhead: string; bullets: string[]; cta: string };
  pitchOutline: string[];
  onePager: string;
}
