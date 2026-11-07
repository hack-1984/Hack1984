import type { Mode, PillarKey } from "./types";

export interface Pillar {
  key: PillarKey;
  startup: string;
  nonprofit: string;
  question: string;
}

/** Fixed order. Pillars are never removed — a tree always has all eight. */
export const PILLARS: readonly Pillar[] = [
  { key: "customer", startup: "Customer", nonprofit: "People served", question: "Who it's for" },
  { key: "problem", startup: "Problem", nonprofit: "Need", question: "Why they need it" },
  { key: "solution", startup: "Solution", nonprofit: "Program", question: "What you build" },
  { key: "approach", startup: "Approach", nonprofit: "Approach", question: "How it operates" },
  { key: "edge", startup: "Edge", nonprofit: "Why us", question: "Why you win" },
  { key: "reach", startup: "Reach", nonprofit: "Outreach", question: "Where customers come from" },
  { key: "revenue", startup: "Revenue", nonprofit: "Funding", question: "How it makes money" },
  { key: "risks", startup: "Risks", nonprofit: "Risks", question: "What could bring it down" },
] as const;

export const PILLAR_KEYS: readonly PillarKey[] = PILLARS.map((p) => p.key);

export const PILLAR_BY_KEY: Record<PillarKey, Pillar> = Object.fromEntries(
  PILLARS.map((p) => [p.key, p])
) as Record<PillarKey, Pillar>;

/** Display label for a pillar in the given mode. */
export function pillarLabel(key: PillarKey, mode: Mode): string {
  const p = PILLAR_BY_KEY[key];
  return mode === "nonprofit" ? p.nonprofit : p.startup;
}

/** The one-line prompt shown under a pillar's label. */
export function pillarQuestion(key: PillarKey): string {
  return PILLAR_BY_KEY[key].question;
}

/** Index of a pillar in the fixed order — use this for layout, not array position. */
export function pillarOrder(key: PillarKey): number {
  return PILLAR_KEYS.indexOf(key);
}
