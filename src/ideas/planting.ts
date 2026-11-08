// The planting scene's contract: what the browser sees while an idea is being researched.
//
// Two independent feeds, both consumed by src/screens/new-idea/PlantingScene.tsx:
//
//   1. PlantEvent  — real research progress, streamed from POST /api/tree/stream as
//                    newline-delimited JSON (one event per line, same shape as the
//                    graveyard stream). createIdea(input, onEvent) forwards each one.
//   2. Narration   — 8-10 idea-specific status lines ("Finding previous fish-forecast
//                    businesses…"), written once per plant by POST /api/narrate (Haiku,
//                    MODELS.fast). Cycled under the sprout. Not tied to the events.
//
// Under MOCK_AI=1 both routes return fixtures: the stream drips mock queries and sources
// a few hundred ms apart; narrate returns fixture lines. No network, no spend.
import type { Idea, Mode } from "@/lib/types";

/** Research phases, in order. `grow` is the long one (~16s); nothing is observable inside it. */
export type PlantPhase = "queries" | "search" | "read" | "grow" | "save";

export const PLANT_PHASES: PlantPhase[] = ["queries", "search", "read", "grow", "save"];

export type PlantEvent =
  /** A phase began. `text` is a true, short description of what is happening now. */
  | { type: "status"; phase: PlantPhase; text: string }
  /** One search query was written. `purpose` is the research purpose key (competitors, pricing…). */
  | { type: "query"; purpose: string; text: string }
  /** One web page a search returned. `domain` is the hostname without "www.". */
  | { type: "source"; purpose: string; title: string; url: string; domain: string }
  /** Research finished: the Idea, exactly as POST /api/tree would have returned it. */
  | { type: "idea"; idea: Idea }
  /** It failed. Nothing after this. */
  | { type: "error"; message: string };

/** POST /api/narrate */
export interface NarrateRequest {
  name: string;
  description: string;
  mode?: Mode;
}
export interface NarrateResponse {
  /** 8-10 short present-tense lines, ≤ 60 chars each, no trailing punctuation. */
  lines: string[];
}

export const domainOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};
