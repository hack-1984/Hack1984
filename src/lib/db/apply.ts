// Apply TreeUpdates to an Idea on the client, preserving everything the
// backend's Idea (types.ts) does not know about: title, description, sources,
// queries, relation, sourceId. Routes return updates keyed on choice ids; this
// is the one place they land. The server never mutates the idea.
import type { NewChoice, PillarKey, TreeUpdate } from "@/lib/types";
import type { HistType, StoredChoice, StoredIdea } from "./schema";

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const PREFIX: Record<StoredChoice["pillar"], string> = {
  customer: "cus",
  problem: "pro",
  solution: "sol",
  approach: "app",
  edge: "edg",
  reach: "rea",
  revenue: "rev",
  risks: "ris",
};

/** Next free id in a pillar, matching the server's `rev-3` style. */
export function nextChoiceId(idea: Pick<StoredIdea, "choices">, pillar: StoredChoice["pillar"]): string {
  const prefix = PREFIX[pillar];
  const taken = new Set(idea.choices.map((c) => c.id));
  for (let n = 1; ; n++) {
    const id = `${prefix}-${n}`;
    if (!taken.has(id)) return id;
  }
}

/** The graveyard's haunt carries a `ghost` the frozen type does not declare. */
const ghostOf = (u: TreeUpdate): string | undefined => (u as { ghost?: string }).ghost;

/**
 * Apply updates in order. Every update is appended to history, including ones
 * aimed at a choice that no longer exists, so the diary stays complete.
 */
export function applyUpdates(idea: StoredIdea, updates: TreeUpdate[]): StoredIdea {
  const next: StoredIdea = { ...idea, choices: [...idea.choices], history: [...idea.history] };

  for (const u of updates) {
    next.history.push(u);
    const i = u.choiceId ? next.choices.findIndex((c) => c.id === u.choiceId) : -1;
    const target = i >= 0 ? next.choices[i] : undefined;

    switch (u.action) {
      case "strengthen":
      case "weaken":
      case "haunt": {
        if (!target || target.status !== "active") break; // nothing to move on a retired or pending choice
        const sign = u.action === "strengthen" ? 1 : -1;
        const delta = u.delta ?? (u.action === "haunt" ? -10 : sign * 5);
        // A strengthen never lowers and a weaken/haunt never raises, whatever sign the delta came with.
        const applied = u.action === "strengthen" ? Math.abs(delta) : -Math.abs(delta);
        // Only set keys that have a value: the document is saved as JSON, and an
        // explicit undefined would make the saved copy differ from this one.
        const changed: StoredChoice = {
          ...target,
          confidence: clamp(target.confidence + applied),
          evidence: u.evidence ? [...target.evidence, ...u.evidence] : target.evidence,
        };
        if (u.feasibility) changed.feasibility = u.feasibility;
        if (u.action === "haunt") changed.marker = ghostOf(u) ?? u.reason;
        next.choices[i] = changed;
        break;
      }
      case "kill": {
        if (!target || target.status !== "active") break;
        next.choices[i] = {
          ...target,
          status: "killed",
          evidence: u.evidence ? [...target.evidence, ...u.evidence] : target.evidence,
        };
        break;
      }
      case "add": {
        if (!u.newChoice) break;
        const nc: NewChoice = u.newChoice;
        // Already on the tree (same label in the same pillar, not killed)? Don't duplicate it.
        const dup = next.choices.find(
          (c) => c.pillar === nc.pillar && c.status !== "killed" && c.label.trim().toLowerCase() === nc.label.trim().toLowerCase()
        );
        if (dup) break;
        next.choices.push({
          ...nc,
          id: nextChoiceId(next, nc.pillar),
          evidence: [...(nc.evidence ?? []), ...(u.evidence ?? [])],
        });
        break;
      }
    }
  }
  return next;
}

/** What one batch of updates did, for "what this changed" lists and pillar highlights. */
export interface Change {
  type: HistType;
  choiceId: string;
  choiceText: string;
  pillar: PillarKey;
  reason: string;
}

/** Describe `updates` as applied from `before` to `after` (the result of applyUpdates). */
export function describeUpdates(before: StoredIdea, after: StoredIdea, updates: TreeUpdate[]): Change[] {
  const changes: Change[] = [];
  for (const u of updates) {
    if (u.action === "add" && u.newChoice) {
      const nc = u.newChoice;
      const c = after.choices.find(
        (x) => x.pillar === nc.pillar && x.status !== "killed" && x.label.trim().toLowerCase() === nc.label.trim().toLowerCase()
      );
      if (c) changes.push({ type: nc.status === "proposed" ? "Suggested" : "Added", choiceId: c.id, choiceText: c.label, pillar: c.pillar, reason: u.reason });
      continue;
    }
    const was = u.choiceId ? before.choices.find((x) => x.id === u.choiceId) : undefined;
    if (!was || was.status !== "active") continue;
    const type: HistType = u.action === "kill" ? "Removed" : u.action === "strengthen" ? "Strengthened" : "Weakened";
    changes.push({ type, choiceId: was.id, choiceText: was.label, pillar: was.pillar, reason: u.reason });
  }
  return changes;
}

/** The founder accepts a proposed choice. Its pivot parent, if any, is killed. */
export function adopt(idea: StoredIdea, choiceId: string, at = Date.now()): StoredIdea {
  const c = idea.choices.find((x) => x.id === choiceId);
  if (!c || c.status !== "proposed") return idea;
  const parent = c.parentId ? idea.choices.find((x) => x.id === c.parentId) : undefined;
  const killsParent = parent && (c.relation ?? "pivots-from") === "pivots-from";
  const choices = idea.choices.map((x) =>
    x.id === choiceId ? { ...x, status: "active" as const } : killsParent && x.id === parent!.id ? { ...x, status: "killed" as const } : x
  );
  const history: TreeUpdate[] = [
    ...idea.history,
    { action: "add", choiceId, reason: "Founder accepted this choice", source: "plan", at },
    ...(killsParent
      ? [{ action: "kill" as const, choiceId: parent!.id, reason: `Replaced by ${c.label}`, source: "plan" as const, at }]
      : []),
  ];
  return { ...idea, choices, history };
}

/** The founder rejects a proposed choice: it is removed, and the diary says so. */
export function reject(idea: StoredIdea, choiceId: string, at = Date.now()): StoredIdea {
  const c = idea.choices.find((x) => x.id === choiceId);
  if (!c || c.status !== "proposed") return idea;
  return {
    ...idea,
    choices: idea.choices.filter((x) => x.id !== choiceId),
    history: [...idea.history, { action: "kill", choiceId, reason: "Founder rejected this suggestion", source: "plan", at }],
  };
}
