// Shapes the widget routes send back, as the frontend reads them.
//
// Defined here rather than imported from src/server/** so screens never depend
// on server code. They mirror src/server/conversation/deps.ts (TreeUpdate,
// Persona, Chat) and src/server/graveyard/types.ts (records). Backend ask:
// move these into src/lib/contracts.ts, then delete this file.
import type { PillarKey } from "@/lib/types";

export interface WireEvidence {
  type: "source" | "quote" | "competitor";
  text: string;
  url?: string;
  origin: string;
  tier: "simulated" | "researched" | "real";
}

export interface WireNewChoice {
  pillar: PillarKey;
  parentId?: string;
  label: string;
  sub?: string;
  detail?: string;
  confidence?: number;
  status: "active" | "killed" | "proposed";
  evidence?: WireEvidence[];
}

/** A TreeUpdate as the routes return it (deps.ts adds `ghost` for haunts). */
export interface WireUpdate {
  action: "strengthen" | "weaken" | "kill" | "add" | "haunt";
  choiceId?: string;
  delta?: number;
  newChoice?: WireNewChoice;
  evidence?: WireEvidence[];
  ghost?: string;
  reason: string;
  quote?: string;
  source: string;
  at?: number;
}

/** One record from POST /api/graveyard/detail. */
export interface GraveRecord {
  id: string;
  name: string;
  url?: string;
  founded?: number;
  died?: number;
  raisedUsd?: number;
  category?: string;
  causeOneWord?: string;
  epitaph: string;
  story: string;
  lesson: string;
  lessonLabel?: string;
  similarity: number;
  threatens: { pillar: PillarKey; weight: number; choiceId?: string }[];
  sources: string[];
  updates: WireUpdate[];
}

export interface GraveyardDetailResponse {
  records: GraveRecord[];
  adjacent: boolean;
}
