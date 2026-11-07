// Presenters: one function per response shape. Add new shapes here, not in the records.
import type { Grave, Idea } from "../conversation/deps";
import { graveyardConfig as cfg } from "./config";
import type { DetailedRecord, FailureRecord } from "./types";
import { buildUpdates, type RecordUpdates } from "./updates";

export function formatYears(r: Pick<FailureRecord, "founded" | "died">): string {
  if (r.founded && r.died) return r.founded === r.died ? String(r.died) : `${r.founded}–${r.died}`;
  if (r.died) return `?–${r.died}`;
  if (r.founded) return `${r.founded}–?`;
  return "unknown";
}

export function formatUsd(n?: number): string | undefined {
  if (!n || n <= 0) return undefined;
  const fmt = (v: number, unit: string) => `$${v >= 10 ? Math.round(v) : Math.round(v * 10) / 10}${unit}`;
  if (n >= 1e9) return fmt(n / 1e9, "B");
  if (n >= 1e6) return fmt(n / 1e6, "M");
  if (n >= 1e3) return fmt(n / 1e3, "K");
  return `$${Math.round(n)}`;
}

/** Frozen /api/graveyard shape. Returns null when no haunt target exists (empty tree). */
export function toGrave(record: FailureRecord, updates: RecordUpdates): Grave | null {
  const haunt = updates.haunts[0];
  const learn = updates.learns[0];
  if (!haunt || !learn) return null;
  return {
    name: record.name,
    years: formatYears(record),
    epitaph: record.epitaph,
    raised: formatUsd(record.raisedUsd),
    similarity: record.similarity,
    story: record.story,
    threatens: record.threatens[0]?.pillar ?? "risks",
    sources: record.sources,
    haunt,
    learn,
  };
}

export function toGraves(records: FailureRecord[], idea: Idea) {
  return records.map((r) => toGrave(r, buildUpdates(r, idea))).filter((g): g is Grave => g !== null);
}

export function toDetailed(records: FailureRecord[], idea: Idea): DetailedRecord[] {
  return records.map((r) => ({ ...r, updates: buildUpdates(r, idea).all }));
}

export const isAdjacent = (records: FailureRecord[]) => !records.some((r) => r.similarity >= cfg.adjacentThreshold);
