"use client";

// Planting a seed, and small per-browser caches. Everything durable lives in
// src/lib/db (Supabase for accounts, browser storage for guests); this file is
// the thin adapter the screens were written against.
import { ideaStore, pitchFrom, toStored, type StoredIdea } from "@/lib/db";
import type { TreeRequest, TreeResponse } from "@/lib/contracts";
import type { Mode, TeamProfile } from "@/lib/types";

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

/**
 * Plant a seed: research via POST /api/tree, wrap the result with the probe
 * (title + description) and save it to the founder's account.
 */
export async function createIdea(input: { name: string; description: string; mode?: Mode }): Promise<SavedIdea> {
  const store = ideaStore();
  const team = (await store.getTeam().catch(() => null)) ?? EMPTY_TEAM;
  const probe = { title: input.name.trim(), description: input.description.trim() };
  const body: TreeRequest = { pitch: pitchFrom(probe), team, ...(input.mode ? { mode: input.mode } : {}) };
  let res: Response;
  try {
    res = await fetch("/api/tree", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach Sprout. Check your connection and try again.");
  }
  if (!res.ok) {
    const detail = await res.json().then((j) => (j && typeof j.error === "string" ? j.error : ""), () => "");
    throw new Error(
      res.status === 501
        ? "Research isn't available on this server right now."
        : detail || `Research failed (error ${res.status}). Try again.`
    );
  }
  const { idea } = (await res.json()) as TreeResponse;
  if (!idea || !Array.isArray(idea.choices)) throw new Error("Research came back empty. Try again.");
  const stored = await store.save(toStored(idea, probe));
  return { id: stored.id, name: stored.title, description: stored.description, idea: stored, createdAt: stored.createdAt };
}
