"use client";

// Ideas the founder has planted, kept in this browser.
//
// The backend is stateless and its Idea has no name field, so the name lives
// here next to the Idea that /api/tree returned. Map edits (evidence added,
// choices removed, resources acquired) are saved per idea so leaving the map
// and coming back, or reloading, doesn't lose them.
import type { TreeRequest, TreeResponse } from "@/lib/contracts";
import type { Idea, Mode, TeamProfile } from "@/lib/types";

export interface SavedIdea {
  id: string;
  /** Founder's short name for the idea ("Pantry"). Frontend-only for now. */
  name: string;
  /** What was sent to /api/tree as the pitch. */
  description: string;
  idea: Idea;
  createdAt: number;
}

const IDEAS = "sprout.ideas";
const MAP = (id: string) => `sprout.map.${id}`;

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

/** Newest first. */
export function listIdeas(): SavedIdea[] {
  const all = readJSON<SavedIdea[]>(IDEAS, []);
  return Array.isArray(all) ? all.slice().sort((a, b) => b.createdAt - a.createdAt) : [];
}

export function getIdea(id: string): SavedIdea | undefined {
  return listIdeas().find((s) => s.id === id);
}

export function saveIdea(saved: SavedIdea) {
  writeJSON(IDEAS, [saved, ...listIdeas().filter((s) => s.id !== saved.id)]);
}

/** The map's own editable state for one idea (shape owned by the map's logic). */
export function loadMapState<T>(id: string): T | null {
  return readJSON<T | null>(MAP(id), null);
}
export function saveMapState(id: string, state: unknown) {
  writeJSON(MAP(id), state);
}

const EMPTY_TEAM: TeamProfile = { roles: [], skills: [], tech: [] };

/**
 * Plant a seed: research the description via POST /api/tree, then keep the
 * result under the founder's name. The description is the pitch, so it is
 * what the research step searches on.
 */
export async function createIdea(input: { name: string; description: string; mode?: Mode }): Promise<SavedIdea> {
  const body: TreeRequest = { pitch: input.description, team: EMPTY_TEAM, ...(input.mode ? { mode: input.mode } : {}) };
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
  const saved: SavedIdea = {
    id: idea.id,
    name: input.name.trim(),
    description: input.description.trim(),
    idea,
    createdAt: Date.now(),
  };
  saveIdea(saved);
  return saved;
}
