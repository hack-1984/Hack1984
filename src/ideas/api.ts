"use client";

// Typed calls to the widget routes. Each takes the stored Idea (ctx.buildIdea(),
// exactly as the backend shaped it) and throws an Error with a readable message.
import type {
  LaunchPersonasRequest,
  LaunchPersonasResponse,
  LaunchRunRequest,
  LaunchRunResponse,
  LaunchSceneRequest,
  LaunchSceneResponse,
} from "@/lib/contracts";
import type { Idea, SceneSpec, SimPersona } from "@/lib/types";
import type { ChatResponse, ExtractResponse, GraveyardDetailResponse, WireChatMessage, WirePersona, WireRole } from "./wire";

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
export function sendChat(idea: Idea, persona: WirePersona, messages: WireChatMessage[]) {
  return postJSON<ChatResponse>("/api/chat", { idea, persona, messages }, "a reply");
}

/** POST /api/extract with only the newest exchange (the founder's line and the reply). */
export function extractUpdates(idea: Idea, persona: WirePersona, exchange: WireChatMessage[]) {
  return postJSON<ExtractResponse>("/api/extract", { idea, persona, messages: exchange, source: persona.role }, "what this changed").then((r) => r.updates);
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
