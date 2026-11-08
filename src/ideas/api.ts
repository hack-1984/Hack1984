"use client";

// Typed calls to the widget routes. Each takes the stored Idea (ctx.buildIdea(),
// exactly as the backend shaped it) and throws an Error with a readable message.
import type {
  FeasibilityRequest,
  FeasibilityResponse,
  LaunchPersonasRequest,
  LaunchPersonasResponse,
  LaunchRunRequest,
  LaunchRunResponse,
  LaunchSceneRequest,
  LaunchSceneResponse,
} from "@/lib/contracts";
import type { Idea, SceneSpec, SimPersona, TeamProfile } from "@/lib/types";
import type { BuildResponse, ChatResponse, ExtractResponse, GraveRecord, GraveyardDetailResponse, SuggestResponse, WireChatMessage, WirePersona, WireRole, WireUpdate } from "./wire";

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

// ---------- Customer discussion ----------

/** POST /api/persona: a simulated person grounded in a real complaint from the research. */
export function fetchPersona(idea: Idea, role: WireRole, choiceId?: string) {
  return postJSON<{ persona: WirePersona }>("/api/persona", { idea, role, ...(choiceId ? { choiceId } : {}) }, "the conversation").then((r) => r.persona);
}

/** POST /api/chat: the persona's next line. An empty `messages` list gets its opening line. */
export function sendChat(idea: Idea, persona: WirePersona, messages: WireChatMessage[], focusChoiceId?: string) {
  return postJSON<ChatResponse>("/api/chat", { idea, persona, messages, ...(focusChoiceId ? { focusChoiceId } : {}) }, "a reply");
}

/** POST /api/extract with only the newest exchange (the founder's line and the reply). */
export function extractUpdates(idea: Idea, persona: WirePersona, exchange: WireChatMessage[]) {
  // The advisor is a mentor, not a market signal: its updates are tagged as planning advice.
  const source = persona.role === "advisor" ? "plan" : persona.role;
  return postJSON<ExtractResponse>("/api/extract", { idea, persona, messages: exchange, source }, "what this changed").then((r) => r.updates);
}

/** POST /api/suggest: things the founder could say next. Never throws; [] when unavailable. */
export function fetchSuggestions(idea: Idea, persona: WirePersona, messages: WireChatMessage[], focusChoiceId?: string): Promise<string[]> {
  return postJSON<SuggestResponse>("/api/suggest", { idea, persona, messages, ...(focusChoiceId ? { focusChoiceId } : {}) }, "suggestions")
    .then((r) => (Array.isArray(r.suggestions) ? r.suggestions.filter((s) => typeof s === "string") : []))
    .catch(() => []);
}

// ---------- Launch day / Open House ----------

export function launchScene(idea: Idea) {
  return postJSON<LaunchSceneResponse>("/api/launch/scene", { idea } satisfies LaunchSceneRequest, "the launch").then((r) => r.scene);
}

export function launchPersonas(idea: Idea, scene: SceneSpec) {
  return postJSON<LaunchPersonasResponse>("/api/launch/personas", { idea, scene } satisfies LaunchPersonasRequest, "the crowd").then((r) => r.personas);
}

export function launchRun(idea: Idea, scene: SceneSpec, personas: SimPersona[], price: number) {
  return postJSON<LaunchRunResponse>("/api/launch/run", { idea, scene, personas, price } satisfies LaunchRunRequest, "the results");
}

// ---------- Build, Team, node actions ----------

/** POST /api/build: landing copy, pitch outline and one-pager from the tree. */
export function fetchBuild(idea: Idea) {
  return postJSON<BuildResponse>("/api/build", { idea }, "your launch materials");
}

/** POST /api/feasibility: weakens or strengthens choices against what the team can do. */
export function checkFeasibility(idea: Idea, team: TeamProfile) {
  return postJSON<FeasibilityResponse>("/api/feasibility", { idea, team } satisfies FeasibilityRequest, "the team check").then((r) => r.updates);
}

/** POST /api/node/research: web evidence for or against one choice. */
export function researchChoice(idea: Idea, choiceId: string, team?: TeamProfile | null) {
  return postJSON<{ updates: WireUpdate[] }>("/api/node/research", { idea, choiceId, ...(team ? { team } : {}) }, "research").then((r) => r.updates);
}

/** POST /api/node/plan: 3-5 next steps to test one choice. */
export function planChoice(idea: Idea, choiceId: string, team?: TeamProfile | null) {
  return postJSON<{ steps: string[] }>("/api/node/plan", { idea, choiceId, ...(team ? { team } : {}) }, "a plan").then((r) => r.steps);
}

// ---------- Graveyard, streamed ----------

/** One line of POST /api/graveyard/stream. */
export type GraveyardEvent =
  | { type: "status"; text: string }
  | { type: "grave"; record: GraveRecord }
  | { type: "done"; adjacent: boolean; count: number }
  | { type: "error"; message: string };

/**
 * POST /api/graveyard/stream: calls `onEvent` for each line as it arrives (graves pop in one by one).
 * Resolves when the stream ends; rejects if it can't connect or drops before `done` / `error`.
 * Abort with `signal` when the widget closes (the search keeps running on the server and stays cached).
 */
export async function streamGraveyard(idea: Idea, onEvent: (e: GraveyardEvent) => void, signal?: AbortSignal): Promise<void> {
  let res: Response;
  try {
    res = await fetch("/api/graveyard/stream", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ idea }), signal });
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    throw new Error("Couldn't reach Sprout to load the graveyard. Check your connection and try again.");
  }
  if (!res.ok || !res.body) throw new Error(`Couldn't load the graveyard (error ${res.status}). Try again.`);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  let ended = false;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        const e = JSON.parse(line) as GraveyardEvent;
        if (e.type === "done" || e.type === "error") ended = true;
        onEvent(e);
      }
    }
  } catch (e) {
    if ((e as Error).name === "AbortError") return;
    throw new Error("The graveyard search was interrupted. Try again.");
  }
  if (!ended && !signal?.aborted) throw new Error("The graveyard search was interrupted. Try again.");
}
