"use client";

// Status lines for the planting scene, from POST /api/narrate. Never throws: the scene
// has its own generic lines to fall back on, so an empty array just means "use those".
import type { NarrateRequest, NarrateResponse } from "./planting";

export async function narrateIdea(input: NarrateRequest): Promise<string[]> {
  try {
    const res = await fetch("/api/narrate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return [];
    const { lines } = (await res.json()) as Partial<NarrateResponse>;
    return Array.isArray(lines) ? lines.filter((l): l is string => typeof l === "string" && l.trim().length > 0) : [];
  } catch {
    return [];
  }
}
