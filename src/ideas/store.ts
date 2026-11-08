"use client";

// Planting a seed, and small per-browser caches. Everything durable lives in
// src/lib/db (Supabase for accounts, browser storage for guests); this file is
// the thin adapter the screens were written against.
import { ideaStore, pitchFrom, toStored, type StoredIdea } from "@/lib/db";
import type { TreeRequest, TreeResponse } from "@/lib/contracts";
import type { Idea, Mode, TeamProfile } from "@/lib/types";
import type { PlantEvent } from "./planting";

export interface SavedIdea {
  id: string;
  /** Founder's short name for the idea. */
  name: string;
  description: string;
  idea: StoredIdea;
  createdAt: number;
}

const readJSON = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const writeJSON = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode or full storage: the app still works, it just won't remember.
  }
};

/** Cached widget results per idea (e.g. graveyard records), so a live lookup isn't paid for twice. A cache, not a record. */
const WIDGET = (id: string, key: string) => `sprout.widget.${id}.${key}`;
export function loadWidgetCache<T>(id: string, key: string): T | null {
  return readJSON<T | null>(WIDGET(id, key), null);
}
export function saveWidgetCache(id: string, key: string, value: unknown) {
  writeJSON(WIDGET(id, key), value);
}

const EMPTY_TEAM: TeamProfile = { roles: [], skills: [], tech: [] };

const JSON_HEADERS = { "content-type": "application/json" };

/** Thrown by the stream path when the route itself is unavailable, so the caller can fall back. */
class StreamUnavailable extends Error {}

const describeFailure = async (res: Response) => {
  const detail = await res.json().then((j) => (j && typeof j.error === "string" ? j.error : ""), () => "");
  return res.status === 501
    ? "Research isn't available on this server right now."
    : detail || `Research failed (error ${res.status}). Try again.`;
};

/** The original path: one request, one Idea. */
async function researchOnce(body: TreeRequest): Promise<Idea> {
  let res: Response;
  try {
    res = await fetch("/api/tree", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) });
  } catch {
    throw new Error("Couldn't reach Sprout. Check your connection and try again.");
  }
  if (!res.ok) throw new Error(await describeFailure(res));
  const { idea } = (await res.json()) as TreeResponse;
  return idea;
}

/**
 * The streaming path (POST /api/tree/stream, src/ideas/planting.ts): forwards every
 * PlantEvent as it arrives and resolves with the Idea from the final `idea` event.
 * Throws StreamUnavailable when the route is missing or unreachable, a plain Error
 * when research itself failed.
 */
async function researchStreaming(body: TreeRequest, onEvent: (e: PlantEvent) => void): Promise<Idea> {
  let res: Response;
  try {
    res = await fetch("/api/tree/stream", { method: "POST", headers: JSON_HEADERS, body: JSON.stringify(body) });
  } catch {
    throw new StreamUnavailable("stream unreachable");
  }
  if (res.status === 404 || res.status === 501 || res.status === 405) throw new StreamUnavailable(`stream ${res.status}`);
  if (!res.ok || !res.body) throw new Error(await describeFailure(res));

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let idea: Idea | null = null;
  const handle = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    let e: PlantEvent;
    try {
      e = JSON.parse(trimmed) as PlantEvent;
    } catch {
      return; // a torn line; the next chunk completes it or it was noise
    }
    if (e.type === "idea") idea = e.idea;
    if (e.type === "error") throw new Error(e.message || "Research failed. Try again.");
    try {
      onEvent(e);
    } catch {
      /* a listener bug must not break planting */
    }
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl = buffer.indexOf("\n");
    while (nl >= 0) {
      handle(buffer.slice(0, nl));
      buffer = buffer.slice(nl + 1);
      nl = buffer.indexOf("\n");
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) handle(buffer);
  if (!idea) throw new Error("Research ended early. Try again.");
  return idea;
}

/**
 * Plant a seed: research via POST /api/tree, wrap the result with the probe
 * (title + description) and save it to the founder's account.
 *
 * With `onEvent`, research is streamed from POST /api/tree/stream and every
 * PlantEvent is forwarded (the planting scene draws them). If that route is
 * unavailable it falls back to the plain request, so nothing regresses.
 */
export async function createIdea(
  input: { name: string; description: string; mode?: Mode },
  onEvent?: (e: PlantEvent) => void
): Promise<SavedIdea> {
  const store = ideaStore();
  const team = (await store.getTeam().catch(() => null)) ?? EMPTY_TEAM;
  const probe = { title: input.name.trim(), description: input.description.trim() };
  const body: TreeRequest = { pitch: pitchFrom(probe), team, ...(input.mode ? { mode: input.mode } : {}) };
  let idea: Idea;
  if (onEvent) {
    try {
      idea = await researchStreaming(body, onEvent);
    } catch (err) {
      if (!(err instanceof StreamUnavailable)) throw err;
      idea = await researchOnce(body);
    }
  } else {
    idea = await researchOnce(body);
  }
  if (!idea || !Array.isArray(idea.choices)) throw new Error("Research came back empty. Try again.");
  const stored = await store.save(toStored(idea, probe));
  prefetchGraveyard(stored);
  return { id: stored.id, name: stored.title, description: stored.description, idea: stored, createdAt: stored.createdAt };
}

/**
 * Start the graveyard search in the background so it's usually done before the founder opens it.
 * Fire-and-forget: never awaited, never throws. The server makes it a no-op under MOCK_AI=1.
 * Sends the stored idea, the same one the Graveyard widget sends, so both share one search.
 */
function prefetchGraveyard(idea: StoredIdea) {
  try {
    void fetch("/api/graveyard/prefetch", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idea }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* prefetch is an optimisation; the Graveyard searches on open anyway */
  }
}
