import type { Idea } from "../conversation/deps";
import { graveyardConfig as cfg } from "./config";
import { extractRecords, knownRecords } from "./extract";
import { researchFailures } from "./research";
import type { FailureRecord } from "./types";

export * from "./types";
export { graveyardConfig } from "./config";
export { buildUpdates } from "./updates";
export { toGrave, toGraves, toDetailed, isAdjacent, formatYears, formatUsd } from "./present";

/**
 * One research run per idea: research → extract → top up from known failures.
 * Both /api/graveyard and /api/graveyard/detail read from this cache.
 * Stored on globalThis so dev hot-reloads don't drop it.
 */
type Entry = { at: number; promise: Promise<FailureRecord[]> };
const g = globalThis as unknown as { __graveyardCache?: Map<string, Entry> };
const cache = (g.__graveyardCache ??= new Map());

const cacheKey = (idea: Idea) => `${idea.id}::${idea.pitch}`;

async function runResearch(idea: Idea): Promise<FailureRecord[]> {
  // Score the hand-written fallbacks in parallel so a top-up never adds latency.
  const fallback = knownRecords(idea, cfg.maxGraves);
  let records: FailureRecord[] = [];
  try {
    const { category, results } = await researchFailures(idea);
    records = await extractRecords(idea, category, results);
  } catch (e) {
    console.error("[graveyard] research/extract failed, using known failures", e);
  }
  if (records.length < cfg.minGraves) {
    const taken = new Set(records.map((r) => r.name.toLowerCase()));
    const extra = (await fallback).filter((k) => !taken.has(k.name.toLowerCase()));
    records = [...records, ...extra.slice(0, cfg.minGraves - records.length)];
  }
  return records.slice(0, cfg.maxGraves);
}

export function getRecords(idea: Idea): Promise<FailureRecord[]> {
  const key = cacheKey(idea);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < cfg.cacheTtlMs) return hit.promise;
  const promise = runResearch(idea);
  cache.set(key, { at: Date.now(), promise });
  promise.catch(() => cache.delete(key)); // don't cache failures
  return promise;
}
