import type { Choice, Idea, PillarKey } from "./deps";

export const isMock = () => process.env.MOCK_AI === "1";

/** nanoid(8)-style id without adding a dependency. */
export function newId(size = 8): string {
  const alphabet = "useandom26T198340PX75pxJACKVERYMINDBUSHWOLFGQZbfghjklqvwyzrict";
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let id = "";
  for (let i = 0; i < size; i++) id += alphabet[bytes[i] & 63];
  return id;
}

/** Rejects if the promise doesn't settle in time, so a stuck AI/search call can't hang a route. */
export function withDeadline<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e))
    );
  });
}

/** Per-call deadlines (ms). Targets: chat < 4s avg, graveyard < 20s, build < 10s. */
export const DEADLINES = {
  persona: 8000,
  chat: 15000,
  extract: 20000,
  category: 3000,
  graveExtract: 9000,
  knownScore: 6000,
  build: 20000,
};

export const clamp =(n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

export function activeChoices(idea: Idea): Choice[] {
  return (idea.choices ?? []).filter((c) => c.status === "active");
}

/** Highest-confidence active choice in a pillar. */
export function topChoice(idea: Idea, pillar: PillarKey): Choice | undefined {
  return activeChoices(idea)
    .filter((c) => c.pillar === pillar)
    .sort((a, b) => b.confidence - a.confidence)[0];
}

/** Resolve a preferred id to an active choice, falling back to the pillar's top choice. */
export function resolveChoice(idea: Idea, preferredId: string | undefined, pillar: PillarKey): Choice | undefined {
  const act = activeChoices(idea);
  return act.find((c) => c.id === preferredId) ?? topChoice(idea, pillar);
}

/** Parse a JSON body; returns null on bad JSON or a missing idea. */
export async function readBody<T extends { idea?: unknown }>(req: Request): Promise<T | null> {
  try {
    const body = (await req.json()) as T;
    if (!body || typeof body !== "object" || !body.idea || typeof body.idea !== "object") return null;
    const idea = body.idea as Partial<Idea>;
    // Be forgiving about older idea shapes missing research/choices.
    idea.choices ??= [];
    idea.history ??= [];
    idea.research ??= { competitors: [], complaints: [], marketNotes: [] };
    idea.research.competitors ??= [];
    idea.research.complaints ??= [];
    idea.research.marketNotes ??= [];
    return body;
  } catch {
    return null;
  }
}

export const badRequest = (msg: string) => Response.json({ error: msg }, { status: 400 });

export function serverError(where: string, e: unknown) {
  console.error(`[${where}]`, e);
  return Response.json({ error: `${where} failed`, detail: e instanceof Error ? e.message : String(e) }, { status: 500 });
}

/** Lowercased word set for crude relatedness scoring. */
export function words(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9$ ]+/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

export function overlap(a: string, b: string): number {
  const A = words(a);
  let n = 0;
  for (const w of words(b)) if (A.has(w)) n++;
  return n;
}
