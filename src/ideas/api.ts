"use client";

// Typed calls to the widget routes. Each takes the Idea built from the map's
// current state (see toIdea.ts) and throws an Error with a readable message.
import type { Idea } from "@/lib/types";
import type { GraveyardDetailResponse } from "./wire";

async function postJSON<T>(path: string, body: unknown, what: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  } catch {
    throw new Error(`Couldn't reach Sprout to load ${what}. Check your connection and try again.`);
  }
  if (!res.ok) {
    const detail = await res.json().then((j) => (j && typeof j.error === "string" ? j.error : ""), () => "");
    throw new Error(
      res.status === 501 ? `${what[0].toUpperCase() + what.slice(1)} isn't available on this server right now.` : detail || `Couldn't load ${what} (error ${res.status}). Try again.`
    );
  }
  return (await res.json()) as T;
}

/** POST /api/graveyard/detail: similar startups that shut down, each with its haunt and learn updates. */
export function fetchGraveyard(idea: Idea) {
  return postJSON<GraveyardDetailResponse>("/api/graveyard/detail", { idea }, "the graveyard");
}
