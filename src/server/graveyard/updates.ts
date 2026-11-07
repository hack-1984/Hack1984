import type { Evidence, Idea, TreeUpdate } from "../conversation/deps";
import { activeChoices, resolveChoice } from "../conversation/util";
import { graveyardConfig, type GraveyardConfig } from "./config";
import type { FailureRecord } from "./types";

export interface RecordUpdates {
  haunts: TreeUpdate[];
  learns: TreeUpdate[];
  all: TreeUpdate[]; // haunt, learn, haunt, learn...
}

export function hauntDelta(similarity: number, cfg: GraveyardConfig = graveyardConfig): number {
  const { min, max } = cfg.hauntDelta; // min is the stronger (more negative) one
  const s = Math.min(100, Math.max(0, similarity)) / 100;
  return Math.round(max + (min - max) * s);
}

function sourceEvidence(record: FailureRecord): Evidence[] {
  return [
    {
      type: "source",
      text: record.quote?.text ?? record.story,
      url: record.quote?.url ?? record.sources[0],
      origin: `graveyard: ${record.name}`,
      tier: "researched",
    },
  ];
}

/** Tree changes for one record: a haunt on the threatened choice, plus a proposed "learn" option. */
export function buildUpdates(record: FailureRecord, idea: Idea, cfg: GraveyardConfig = graveyardConfig, now = Date.now()): RecordUpdates {
  const threats = cfg.multiHaunt ? record.threatens : record.threatens.slice(0, 1);
  const out: RecordUpdates = { haunts: [], learns: [], all: [] };
  const used = new Set<string>();
  const evidence = sourceEvidence(record);

  for (const t of threats) {
    let target = resolveChoice(idea, t.choiceId, t.pillar);
    // No active choice in that pillar: fall back to the weakest-held active choice anywhere (single-haunt only).
    if (!target && !cfg.multiHaunt) target = activeChoices(idea).sort((a, b) => a.confidence - b.confidence)[0];
    if (!target || used.has(target.id)) continue;
    used.add(target.id);

    const haunt: TreeUpdate = {
      action: "haunt",
      choiceId: target.id,
      delta: hauntDelta(record.similarity, cfg),
      ghost: record.name,
      reason: record.lesson,
      quote: record.epitaph,
      evidence,
      source: "graveyard",
      at: now,
    };
    const learn: TreeUpdate = {
      action: "add",
      newChoice: {
        pillar: target.pillar,
        parentId: target.id,
        label: record.lessonLabel || record.lesson.split(/\s+/).slice(0, 4).join(" "),
        sub: `Lesson from ${record.name}`.slice(0, 40),
        detail: record.lesson,
        confidence: cfg.learnConfidence,
        status: "proposed",
        evidence,
      },
      reason: record.lesson,
      evidence,
      source: "graveyard",
      at: now,
    };
    out.haunts.push(haunt);
    out.learns.push(learn);
    out.all.push(haunt, learn);
  }
  return out;
}
