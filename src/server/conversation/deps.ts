/**
 * TEMPORARY Step 0 shim — the single import surface for all of Tony's code.
 *
 * Step 0 (Nick's src/lib/contracts.ts, src/lib/ai/**, src/data/fixture-idea.ts,
 * and the updated src/lib/types.ts) wasn't on main when this was written, so the
 * types below mirror the build plan exactly and askJSON/search are minimal local
 * stand-ins.
 *
 * WHEN STEP 0 LANDS: replace this whole file with
 *
 *   export * from "@/lib/types";
 *   export * from "@/lib/contracts";
 *   export { askJSON, MODELS, search } from "@/lib/ai";
 *
 * (adjust paths to whatever Nick named them) and delete ./fixture.ts in favour of
 * "@/data/fixture-idea". Nothing else should need to change.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { tavily } from "@tavily/core";
import type { z } from "zod";

// ---------- core types (src/lib/types.ts, per the plan) ----------

export type PillarKey =
  | "customer"
  | "problem"
  | "solution"
  | "approach"
  | "edge"
  | "reach"
  | "revenue"
  | "risks";

export type UpdateSource =
  | "research"
  | "customer"
  | "competitor"
  | "investor"
  | "plan"
  | "launch"
  | "graveyard"
  | "feasibility"
  | "reply";

export interface Evidence {
  type: "source" | "quote" | "competitor";
  text: string;
  url?: string;
  origin: string;
  tier: "simulated" | "researched" | "real";
}

export interface Choice {
  id: string;
  pillar: PillarKey;
  parentId?: string;
  label: string;
  sub: string;
  detail: string;
  confidence: number;
  status: "active" | "killed" | "proposed";
  evidence: Evidence[];
}

export type NewChoice = Omit<Choice, "id" | "evidence"> & { evidence?: Evidence[] };

export interface TreeUpdate {
  action: "strengthen" | "weaken" | "kill" | "add" | "haunt";
  choiceId?: string;
  delta?: number;
  newChoice?: NewChoice;
  evidence?: Evidence[];
  ghost?: string;
  reason: string;
  quote?: string;
  source: UpdateSource;
  at: number;
}

export interface Idea {
  id: string;
  mode: "startup" | "nonprofit";
  pitch: string;
  choices: Choice[];
  history: TreeUpdate[];
  research: {
    competitors: { name: string; url?: string; summary: string }[];
    complaints: { text: string; url: string; where: string }[];
    marketNotes: string[];
  };
  createdAt: number;
}

// ---------- route contracts (src/lib/contracts.ts, per the plan) ----------

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

export interface PersonaReq {
  idea: Idea;
  role: PersonaRole;
  choiceId?: string;
}
export interface PersonaRes {
  persona: Persona;
}

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

export interface BuildReq {
  idea: Idea;
}
export interface BuildRes {
  landing: { headline: string; subhead: string; bullets: string[]; cta: string };
  pitchOutline: string[];
  onePager: string;
}

// ---------- AI helpers (src/lib/ai/**, per the plan) ----------

export const MODELS = { main: "claude-opus-5-5", fast: "claude-haiku-5-5" } as const;

let _client: Anthropic | null = null;
function client() {
  if (!_client) _client = new Anthropic();
  return _client;
}

export async function askJSON<S extends z.ZodType>(opts: {
  system: string;
  prompt: string;
  schema: S;
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
}): Promise<z.infer<S>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await client().messages.parse({
        model: opts.model ?? MODELS.main,
        max_tokens: opts.maxTokens ?? 4000,
        system: opts.system,
        messages: [{ role: "user", content: opts.prompt }],
        output_config: {
          format: zodOutputFormat(opts.schema),
          effort: opts.effort ?? "low",
        },
      });
      if (res.parsed_output != null) return res.parsed_output as z.infer<S>;
      lastErr = new Error(`askJSON: no parsed output (stop_reason=${res.stop_reason})`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

export async function search(
  query: string,
  maxResults = 5
): Promise<{ title: string; url: string; content: string }[]> {
  const tv = tavily({ apiKey: process.env.TAVILY_API_KEY ?? "" });
  const res = await tv.search(query, { maxResults });
  return (res.results ?? []).map((r) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    content: r.content ?? "",
  }));
}
