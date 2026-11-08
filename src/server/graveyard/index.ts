import type { Idea } from "../conversation/deps";
import { graveyardConfig as cfg } from "./config";
import { extractRecords, knownRecords } from "./extract";
import { canSearch, getCategory, queriesFor, searchOne } from "./research";
import { isAdjacent } from "./present";
import type { FailureRecord } from "./types";

export * from "./types";
export { graveyardConfig } from "./config";
export { buildUpdates } from "./updates";
export { toGrave, toGraves, toDetailed, isAdjacent, formatYears, formatUsd } from "./present";

/**
 * One research run per idea, shared by everyone who asks:
 *   /api/graveyard, /detail and /learn await the finished list (getRecords);
 *   /api/graveyard/stream subscribes and gets each grave the moment it's found;
 *   /api/graveyard/prefetch starts a run early so it's often done before anyone looks.
 * A subscriber that joins mid-run is replayed what's been found so far, so nothing
 * is searched twice. Stored on globalThis so dev hot-reloads don't drop it.
 */
export type GraveEvent =
  | { type: "status"; text: string }
  | { type: "record"; record: FailureRecord }
  | { type: "done"; adjacent: boolean; count: number }
  | { type: "error"; message: string };

interface Run {
  at: number;
  status: string;
  records: FailureRecord[];
  finished: boolean;
  adjacent: boolean;
  listeners: Set<(e: GraveEvent) => void>;
  promise: Promise<FailureRecord[]>;
}

const g = globalThis as unknown as { __graveyardRuns?: Map<string, Run> };
const runs = (g.__graveyardRuns ??= new Map());

const cacheKey = (idea: Idea) => `${idea.mode ?? "startup"}::${idea.id}::${idea.pitch}`;
const norm = (s: string) => s.trim().toLowerCase();

function emit(run: Run, e: GraveEvent) {
  if (e.type === "status") run.status = e.text;
  for (const fn of run.listeners) {
    try {
      fn(e);
    } catch {
      /* a closed stream; it unsubscribes itself */
    }
  }
}

/** Add records the run doesn't have yet (by name), up to maxGraves, announcing each one. */
function addRecords(run: Run, found: FailureRecord[]) {
  for (const r of found) {
    if (run.records.length >= cfg.maxGraves) return;
    if (run.records.some((x) => norm(x.name) === norm(r.name))) continue;
    run.records.push(r);
    emit(run, { type: "record", record: r });
  }
}

async function research(idea: Idea, run: Run): Promise<FailureRecord[]> {
  const nonprofit = idea.mode === "nonprofit";
  const kind = nonprofit ? "nonprofits" : "startups";
  // Score the hand-written fallbacks in parallel so a top-up never adds latency.
  const fallback = knownRecords(idea, cfg.maxGraves).catch(() => [] as FailureRecord[]);

  try {
    emit(run, { type: "status", text: `Looking for similar ${kind} that shut down…` });
    const category = await getCategory(idea);
    if (canSearch()) {
      emit(run, { type: "status", text: `Searching for shut-down ${category} ${kind}…` });
      const seen = new Set<string>();
      let read = 0;
      // Each search is extracted as soon as it returns, in parallel, so the first
      // graves arrive long before the slowest search finishes.
      await Promise.allSettled(
        queriesFor(category, idea.mode).map(async (q) => {
          const results = await searchOne(q, seen);
          if (!results.length) return;
          read += results.length;
          emit(run, { type: "status", text: `Reading ${read} articles…` });
          addRecords(run, await extractRecords(idea, category, results));
        })
      );
    } else {
      console.warn("[graveyard] TAVILY_API_KEY is not set: no web research, using the hand-written failures only");
    }
  } catch (e) {
    console.error("[graveyard] research/extract failed, using known failures", e);
  }

  if (run.records.length < cfg.minGraves) {
    emit(run, { type: "status", text: `Adding well-documented ${kind} that shut down…` });
    const taken = new Set(run.records.map((r) => norm(r.name)));
    addRecords(run, (await fallback).filter((k) => !taken.has(norm(k.name))).slice(0, cfg.minGraves - run.records.length));
  }
  return run.records.slice().sort((a, b) => b.similarity - a.similarity);
}

function startRun(idea: Idea, key: string): Run {
  const run: Run = {
    at: Date.now(),
    status: "Starting…",
    records: [],
    finished: false,
    adjacent: false,
    listeners: new Set(),
    promise: Promise.resolve([]),
  };
  run.promise = research(idea, run).then(
    (records) => {
      run.finished = true;
      run.adjacent = isAdjacent(records);
      emit(run, { type: "done", adjacent: run.adjacent, count: records.length });
      return records;
    },
    (err) => {
      run.finished = true;
      runs.delete(key); // don't cache failures
      emit(run, { type: "error", message: "The graveyard search failed. Try again." });
      throw err;
    }
  );
  runs.set(key, run);
  return run;
}

function getRun(idea: Idea): Run {
  const key = cacheKey(idea);
  const hit = runs.get(key);
  if (hit && Date.now() - hit.at < cfg.cacheTtlMs) return hit;
  return startRun(idea, key);
}

/** The finished list, sorted by similarity. Shared with any stream or prefetch of the same idea. */
export function getRecords(idea: Idea): Promise<FailureRecord[]> {
  return getRun(idea).promise;
}

/** Start (or join) the run without waiting for it. */
export function prefetchRecords(idea: Idea): void {
  getRun(idea).promise.catch(() => {});
}

/**
 * Follow a run live. Replays the current status and everything found so far (and `done`
 * if it already finished), then forwards new events. Returns an unsubscribe function.
 */
export function subscribeRecords(idea: Idea, fn: (e: GraveEvent) => void): () => void {
  const run = getRun(idea);
  fn({ type: "status", text: run.status });
  run.records.forEach((record) => fn({ type: "record", record }));
  if (run.finished) {
    fn({ type: "done", adjacent: run.adjacent, count: run.records.length });
    return () => {};
  }
  run.listeners.add(fn);
  return () => run.listeners.delete(fn);
}
