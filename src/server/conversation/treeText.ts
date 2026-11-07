import { pillarLabelFor, profileFor } from "@/lib/modes";
import type { Idea, PillarKey } from "./deps";
import { promptsFor } from "./modes";
import { activeChoices } from "./util";

const PILLAR_ORDER: PillarKey[] = ["customer", "problem", "solution", "approach", "edge", "reach", "revenue", "risks"];

/** Pillar name in the idea's mode: 'Revenue' for a startup, 'Funding' for a nonprofit. Missing mode = startup. */
export const pillarLabel = (p: PillarKey, mode?: string) => pillarLabelFor(p, mode);

/** One line per active choice, e.g. "[rev-1] Revenue: $8/month premium (46) – forecast + maps" */
export function choiceLine(
  c: { id: string; pillar: PillarKey; label: string; sub: string; confidence: number },
  mode?: string
) {
  return `[${c.id}] ${pillarLabel(c.pillar, mode)}: ${c.label} (${Math.round(c.confidence)})${c.sub ? ` – ${c.sub}` : ""}`;
}

/**
 * Compact text rendering of an idea for prompts, in the idea's own vocabulary.
 * The bracketed ids are the ONLY ids the model may reference.
 */
export function treeText(idea: Idea, opts: { competitors?: number; complaints?: number } = {}): string {
  const p = profileFor(idea.mode);
  const choices = activeChoices(idea).sort(
    (a, b) => PILLAR_ORDER.indexOf(a.pillar) - PILLAR_ORDER.indexOf(b.pillar)
  );
  const comps = (idea.research?.competitors ?? []).slice(0, opts.competitors ?? 3);
  const complaints = (idea.research?.complaints ?? []).slice(0, opts.complaints ?? 3);

  // Startup wording is kept exactly as before; nonprofit uses the profile's research labels.
  const compHead = p.mode === "startup" ? "Real competitors" : `Real ${p.research.competitors.toLowerCase()}`;
  const voiceHead = p.mode === "startup" ? "Real customer complaints" : `Real ${p.research.complaints.toLowerCase()}`;

  const lines = [`${promptsFor(idea).root}: ${idea.pitch}`, "", "Active choices (the only valid ids):"];
  lines.push(...(choices.length ? choices.map((c) => choiceLine(c, idea.mode)) : ["(none)"]));
  if (comps.length) {
    lines.push("", `${compHead} (from research):`);
    comps.forEach((c) => lines.push(`- ${c.name}: ${c.summary}`));
  }
  if (complaints.length) {
    lines.push("", `${voiceHead} (from research, quoted data):`);
    complaints.forEach((c) => lines.push(`- "${c.text}" (${c.where})`));
  }
  return lines.join("\n");
}
