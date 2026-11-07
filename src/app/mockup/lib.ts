// Mockup helpers: typed API calls + a tiny client-side tree reducer.
// This page is a throwaway harness for testing the backend before Greg's and
// Ethan's real screens land. Nothing else should import from here.
import type { Choice, Idea, PillarKey, TreeUpdate } from "@/lib/types";

/** Tony's updates can carry `ghost` (haunts); Step 0 types don't have it yet. */
export type Update = TreeUpdate & { ghost?: string };

export const PILLARS: { key: PillarKey; label: string; q: string }[] = [
  { key: "customer", label: "Customer", q: "Who it's for" },
  { key: "problem", label: "Problem", q: "Why they need it" },
  { key: "solution", label: "Solution", q: "What you build" },
  { key: "approach", label: "Approach", q: "How it operates" },
  { key: "edge", label: "Edge", q: "Why you win" },
  { key: "reach", label: "Reach", q: "Where customers come from" },
  { key: "revenue", label: "Revenue", q: "How it makes money" },
  { key: "risks", label: "Risks", q: "What could bring it down" },
];

export async function api<T>(path: string, body: unknown): Promise<{ data: T; ms: number }> {
  const t = performance.now();
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const ms = Math.round(performance.now() - t);
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${text.slice(0, 300)}`);
  return { data: JSON.parse(text) as T, ms };
}

export function confColor(c: number) {
  if (c >= 70) return { bar: "bg-emerald-500", text: "text-emerald-700", ring: "border-emerald-400" };
  if (c >= 45) return { bar: "bg-amber-500", text: "text-amber-700", ring: "border-amber-400" };
  return { bar: "bg-red-500", text: "text-red-700", ring: "border-red-400" };
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
let seq = 0;

/** Apply TreeUpdates the way the real client store presumably will. Returns ids that changed. */
export function applyUpdates(idea: Idea, updates: Update[]): { idea: Idea; changed: string[] } {
  const choices: Choice[] = idea.choices.map((c) => ({ ...c, evidence: [...c.evidence] }));
  const changed: string[] = [];
  for (const u of updates) {
    if (u.action === "add" && u.newChoice) {
      const id = `${u.newChoice.pillar.slice(0, 3)}-n${++seq}${Date.now() % 1000}`;
      choices.push({ ...u.newChoice, id, evidence: [...(u.newChoice.evidence ?? []), ...(u.evidence ?? [])] });
      changed.push(id);
      continue;
    }
    const c = choices.find((x) => x.id === u.choiceId);
    if (!c) continue;
    if (u.action === "kill") c.status = "killed";
    else if (typeof u.delta === "number") c.confidence = clamp(c.confidence + u.delta);
    if (u.action === "haunt") c.marker = u.ghost ?? "haunted";
    if (u.feasibility) c.feasibility = u.feasibility;
    if (u.evidence?.length) c.evidence.push(...u.evidence);
    changed.push(c.id);
  }
  return { idea: { ...idea, choices, history: [...idea.history, ...updates] }, changed };
}

export function setStatus(idea: Idea, id: string, status: Choice["status"]): Idea {
  return { ...idea, choices: idea.choices.map((c) => (c.id === id ? { ...c, status } : c)) };
}

export function describeUpdate(u: Update, idea: Idea): string {
  const target = idea.choices.find((c) => c.id === u.choiceId);
  const name = target ? `${target.label}` : u.choiceId ?? "";
  switch (u.action) {
    case "add":
      return `+ ${u.newChoice?.label ?? "new choice"} (${u.newChoice?.pillar})`;
    case "kill":
      return `✕ killed ${name}`;
    case "haunt":
      return `👻 ${u.ghost ?? "a ghost"} haunts ${name} (${u.delta ?? 0})`;
    default:
      return `${u.action === "strengthen" ? "▲" : "▼"} ${name} ${u.delta && u.delta > 0 ? "+" : ""}${u.delta ?? ""}`;
  }
}
