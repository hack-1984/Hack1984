// Shared data shapes for Idea Tree.
// Change these only after telling the whole team.

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
  | "graveyard";

export interface Evidence {
  type: "source" | "quote" | "competitor";
  tier: EvidenceTier;
  text: string;
  url?: string;
  origin: string; // "research", "customer interview 1", etc.
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
  hauntedBy?: string; // grave name, if a failed startup threatens this choice
}

export interface TeamProfile {
  roles: string[];
  skills: string[];
  tech: string[];
  hoursPerWeek?: number;
  budget?: string;
}

export interface TreeUpdate {
  action: "strengthen" | "weaken" | "kill" | "add";
  choiceId?: string;
  delta?: number;
  newChoice?: Omit<Choice, "id">;
  reason: string;
  quote?: string;
  source: UpdateSource;
  at: number;
}

export interface Idea {
  id: string;
  mode: Mode;
  pitch: string;
  choices: Choice[];
  history: TreeUpdate[];
}

// Launch Day simulation

export interface CustomerGroup {
  id: string;
  name: string;
  figure: "person" | "company";
  count: number;
  color: string;
}

export interface SceneConfig {
  center: { label: string; icon: string };
  groups: CustomerGroup[]; // 1–3
  verbs: { buy: string; curious: string; leave: string };
}

export interface SimPersona {
  id: string;
  groupId: string;
  name: string;
  blurb: string;
  sourceUrl?: string;
  budget: number;
  habits: string[];
}

export interface SimResult {
  personaId: string;
  decision: "buy" | "curious" | "leave";
  reason: string;
  maxPrice: number;
  tellsFriend: boolean;
  committee?: { role: string; verdict: "yes" | "no"; reason: string }[]; // company figures only
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
