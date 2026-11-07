// Shared data shapes for Idea Tree.
//
// NOTE: this file is specified by Step 0 of the master doc, which will paste
// the canonical version over it. These definitions were transcribed from
// "Idea Tree: Nick's Build Plan". After Step 0 lands, nobody edits this file —
// if you need an extra field, define a type in your own folder.

export type PillarKey =
  | "customer"
  | "problem"
  | "solution"
  | "approach"
  | "edge"
  | "reach"
  | "revenue"
  | "risks";

export type Mode = "startup" | "nonprofit";
export type Status = "active" | "killed" | "proposed"; // proposed = dashed pivot option
export type EvidenceTier = "simulated" | "researched" | "real";
export type UpdateSource =
  | "research"
  | "customer"
  | "competitor"
  | "investor"
  | "plan"
  | "launch"
  | "graveyard"
  | "feasibility";

export interface Evidence {
  type: "source" | "quote" | "competitor";
  text: string;
  url?: string;
  origin: string; // "research", "customer interview 1", etc.
  tier: EvidenceTier;
}

export interface Choice {
  id: string;
  pillar: PillarKey;
  parentId?: string;
  label: string; // 2–4 words
  sub: string; // ≤ 4 words
  detail: string; // 1–2 sentences, side panel only
  confidence: number; // 0–100
  status: Status;
  feasibility?: { ok: boolean; note: string };
  evidence: Evidence[];
  plan?: { steps: string[]; done: boolean[] };
  marker?: string;
}

export type NewChoice = Omit<Choice, "id">;

export interface TreeUpdate {
  action: "strengthen" | "weaken" | "kill" | "add" | "haunt";
  choiceId?: string;
  delta?: number;
  newChoice?: NewChoice;
  evidence?: Evidence[];
  feasibility?: { ok: boolean; note: string };
  reason: string;
  quote?: string;
  source: UpdateSource;
  at: number;
}

export interface ResearchBundle {
  competitors: { name: string; url?: string; summary: string }[];
  complaints: { text: string; url: string; where: string }[];
  marketNotes: string[];
}

export interface TeamProfile {
  roles: string[];
  skills: string[];
  tech: string[];
  hoursPerWeek?: number;
  budget?: string;
}

export interface Idea {
  id: string;
  mode: Mode;
  pitch: string;
  choices: Choice[];
  history: TreeUpdate[];
  research: ResearchBundle;
  createdAt: number;
}

// Launch Day simulation

export type GroupColor = "teal" | "purple" | "amber" | "blue" | "pink";

export interface SceneSpec {
  center: { label: string; icon: string };
  groups: {
    id: string;
    name: string;
    figure: "person" | "company";
    count: number;
    color: GroupColor;
  }[];
  verbs: { buy: string; curious: string; leave: string };
}

export interface SimPersona {
  id: string;
  groupId: string;
  name: string;
  blurb: string;
  budget: number;
  habits: string[];
  sourceUrl?: string;
}

export interface SimResult {
  personaId: string;
  decision: "buy" | "curious" | "leave";
  reason: string; // ≤ 8 words
  maxPrice: number; // 0 if they would never pay
  tellsFriend: boolean;
}

export interface LaunchSummary {
  price: number;
  buy: number;
  curious: number;
  leave: number;
  dropOffPrice: number;
  byGroup: { groupId: string; buyRate: number }[];
  topObjections: { text: string; count: number; pillar: PillarKey }[];
}

// Graveyard

export interface Grave {
  name: string;
  years: string;
  epitaph: string;
  raised?: string;
  similarity: number; // 0–100
  story: string;
  threatens: PillarKey;
  sources: string[];
}
