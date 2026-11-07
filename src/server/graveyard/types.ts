// Graveyard record types. Frontend code may import these.
import type { PillarKey, TreeUpdate } from "../conversation/deps";

export type CauseTag =
  | "no-market-need"
  | "ran-out-of-cash"
  | "outcompeted"
  | "pricing"
  | "regulation"
  | "unit-economics"
  | "team"
  | "timing"
  | "product"
  | "other";

export const CAUSE_TAGS: CauseTag[] = [
  "no-market-need",
  "ran-out-of-cash",
  "outcompeted",
  "pricing",
  "regulation",
  "unit-economics",
  "team",
  "timing",
  "product",
  "other",
];

export interface FailureRecord {
  id: string;
  name: string;
  url?: string;
  founded?: number; // years as numbers, so a timeline can place them
  died?: number;
  raisedUsd?: number; // only when a source states it
  category: string; // 'consumer subscription app'
  causeTags: CauseTag[];
  causeOneWord: string; // 'Pricing': short enough for an icon label or inscription
  epitaph: string; // one line
  story: string; // 2-3 sentences
  timeline: { year: number; event: string }[]; // 2-5 events, from sources
  lesson: string; // what to do differently, one line
  lessonLabel?: string; // 2-4 words, label for the proposed "learn" choice
  quote?: { text: string; url: string }; // verbatim from a post-mortem, if found
  similarity: number; // 0-100
  threatens: { pillar: PillarKey; weight: number; choiceId?: string }[]; // 1-3, strongest first
  sources: string[];
}

export type DetailedRecord = FailureRecord & { updates: TreeUpdate[] };

export interface GraveyardDetailRes {
  records: DetailedRecord[];
  adjacent: boolean;
}
