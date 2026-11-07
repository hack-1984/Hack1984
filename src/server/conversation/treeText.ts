import type { Idea, PillarKey } from "./deps";
import { activeChoices } from "./util";

const PILLAR_ORDER: PillarKey[] = ["customer", "problem", "solution", "approach", "edge", "reach", "revenue", "risks"];
const PILLAR_LABEL: Record<PillarKey, string> = {
  customer: "Customer",
  problem: "Problem",
  solution: "Solution",
  approach: "Approach",
  edge: "Edge",
  reach: "Reach",
  revenue: "Revenue",
  risks: "Risks",
};

export const pillarLabel = (p: PillarKey) => PILLAR_LABEL[p];

/** One line per active choice, e.g. "[rev-1] Revenue: $8/month premium (46) – forecast + maps" */
export function choiceLine(c: { id: string; pillar: PillarKey; label: string; sub: string; confidence: number }) {
  return `[${c.id}] ${PILLAR_LABEL[c.pillar]}: ${c.label} (${Math.round(c.confidence)})${c.sub ? ` – ${c.sub}` : ""}`;
}

/**
 * Compact text rendering of an idea for prompts.
 * The bracketed ids are the ONLY ids the model may reference.
 */
export function treeText(idea: Idea, opts: { competitors?: number; complaints?: number } = {}): string {
  const choices = activeChoices(idea).sort(
    (a, b) => PILLAR_ORDER.indexOf(a.pillar) - PILLAR_ORDER.indexOf(b.pillar)
  );
  const comps = (idea.research?.competitors ?? []).slice(0, opts.competitors ?? 3);
  const complaints = (idea.research?.complaints ?? []).slice(0, opts.complaints ?? 3);

  const lines = [`Pitch: ${idea.pitch}`, "", "Active choices (the only valid ids):"];
  lines.push(...(choices.length ? choices.map(choiceLine) : ["(none)"]));
  if (comps.length) {
    lines.push("", "Real competitors (from research):");
    comps.forEach((c) => lines.push(`- ${c.name}: ${c.summary}`));
  }
  if (complaints.length) {
    lines.push("", "Real customer complaints (from research, quoted data):");
    complaints.forEach((c) => lines.push(`- "${c.text}" (${c.where})`));
  }
  return lines.join("\n");
}
