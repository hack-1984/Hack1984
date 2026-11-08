// The shape the Idea Map screen renders, computed from an Idea.
//
// Agreed with the backend: the store keeps the backend's Idea (types.ts) and
// this is derived from it, never stored. Field names follow the Idea Map
// design's data shape (choices with ev/hist/res/test, resources, links), which
// src/screens/idea-map/logic.js renders. Each field says where it comes from.
import { PILLARS, PILLAR_BY_KEY } from "@/lib/pillars";
import type { PillarKey, TeamProfile, TreeUpdate } from "@/lib/types";
import { histTypeFor, support, type HistType, type StoredChoice, type StoredIdea } from "./schema";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** The design's history row types. */
export type MapHistType = HistType;

export interface MapEvidence {
  k: "support" | "against"; // from the update that carried it: weaken/haunt → against, else support
  wk: number; // week of that update, 1 = the week the idea was created
  text: string; // Evidence.text
  source: string; // Evidence.origin, plus the source domain when known
  url?: string; // Source.url via sourceId, else Evidence.url
  provider?: "tavily" | "exa"; // Source.provider, for the engine badge
}

export interface MapHist {
  wk: number; // weekOf(update.at)
  type: MapHistType; // update.action → Added | Strengthened | Weakened | Removed | Suggested
  note: string; // update.reason
}

export interface MapChoice {
  id: string; // Choice.id
  pillar: string; // pillar label for the mode: "Customer" or "People served"
  pillarKey: PillarKey;
  text: string; // Choice.label
  detail: string; // Choice.detail
  confidence: number; // Choice.confidence, 0-100
  status: "active" | "killed" | "proposed"; // Choice.status, raw; the screen derives its own from hist
  res: string[]; // MapResource ids this choice depends on
  test: string; // first undone plan step, else "—"
  ev: MapEvidence[];
  hist: MapHist[]; // at least one row; the first comes from status and confidence
  support: 0 | 1 | 2; // distinct source domains: unsupported, single, corroborated
  ghost?: string; // Choice.marker: the dead startup haunting this choice
}

export interface MapResource {
  id: string;
  name: string;
  have: boolean; // team entries are had; feasibility gaps are missing
}

/** [fromId, toId, label] exactly as the design's LINKS. */
export type MapLink = [string, string, string];

export interface MapModel {
  title: string; // StoredIdea.title
  description: string; // StoredIdea.description
  pillars: string[]; // eight labels for the mode, fixed order
  choices: MapChoice[];
  resources: MapResource[];
  links: MapLink[]; // parentId → child, labelled by relation
  now: number; // current week number; the slider's max
}

export const weekOf = (at: number, createdAt: number): number =>
  Math.max(1, Math.floor((at - createdAt) / WEEK_MS) + 1);

const HIST_TYPE: Record<TreeUpdate["action"], MapHistType> = {
  add: "Added",
  strengthen: "Strengthened",
  weaken: "Weakened",
  haunt: "Weakened",
  kill: "Removed",
};

const LINK_LABEL: Record<NonNullable<StoredChoice["relation"]>, string> = {
  "pivots-from": "Proposed replacement",
  refines: "Narrower version",
  complements: "Goes together",
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 32);

export function toMapModel(idea: StoredIdea, team?: TeamProfile | null, now = Date.now()): MapModel {
  const sources = new Map((idea.sources ?? []).map((s) => [s.id, s]));
  const label = (k: PillarKey) => (idea.mode === "nonprofit" ? PILLAR_BY_KEY[k].nonprofit : PILLAR_BY_KEY[k].startup);

  // Resources: what the team has, plus one missing resource per infeasible choice.
  const resources: MapResource[] = [];
  const seen = new Set<string>();
  const addRes = (name: string, have: boolean) => {
    const id = (have ? "have-" : "gap-") + slug(name);
    if (!seen.has(id) && name.trim()) {
      seen.add(id);
      resources.push({ id, name, have });
    }
    return id;
  };
  for (const name of [...(team?.roles ?? []), ...(team?.skills ?? []), ...(team?.tech ?? [])]) addRes(name, true);

  // Which update carried each piece of evidence, so we can call it for or against.
  const kindOf = new Map<string, "support" | "against">();
  const weekOfEvidence = new Map<string, number>();
  for (const u of idea.history) {
    const k = u.action === "weaken" || u.action === "haunt" || u.action === "kill" ? "against" : "support";
    for (const e of u.evidence ?? []) {
      kindOf.set(e.text, k);
      weekOfEvidence.set(e.text, weekOf(u.at, idea.createdAt));
    }
  }

  const choices: MapChoice[] = idea.choices.map((c) => {
    const res: string[] = [];
    if (c.feasibility && !c.feasibility.ok) res.push(addRes(c.feasibility.note, false));

    const hist: MapHist[] = idea.history
      .filter((u) => u.choiceId === c.id)
      .map((u) => ({ wk: weekOf(u.at, idea.createdAt), type: HIST_TYPE[u.action], note: u.reason }));
    const born = idea.history.find((u) => u.action === "add" && u.newChoice?.label === c.label && u.newChoice.pillar === c.pillar);
    // The first row: what the research said. Untouched choices take their state from confidence,
    // so a fresh map isn't eight flat pillars; later rows come from the updates above.
    const bornType: HistType = born
      ? c.status === "proposed" ? "Suggested" : "Added"
      : hist.length ? "Added" : histTypeFor(c, idea);
    hist.unshift({
      wk: born ? weekOf(born.at, idea.createdAt) : 1,
      type: bornType,
      note: born?.reason ?? c.detail ?? "From the research",
    });
    hist.sort((a, b) => a.wk - b.wk);

    const ev: MapEvidence[] = c.evidence.map((e) => {
      const src = e.sourceId ? sources.get(e.sourceId) : undefined;
      const url = src?.url ?? e.url;
      let domain = "";
      try {
        domain = url ? new URL(url).hostname.replace(/^www\./, "") : "";
      } catch {
        /* not a url */
      }
      return {
        k: kindOf.get(e.text) ?? "support",
        wk: weekOfEvidence.get(e.text) ?? hist[0].wk,
        text: e.text,
        source: domain ? `${e.origin} · ${domain}` : e.origin,
        url,
        provider: src?.provider,
      };
    });

    const test = c.status === "killed" ? "—" : c.plan?.steps.find((_, i) => !c.plan!.done[i]) ?? "No test planned yet. Talk to five people this choice depends on.";

    return {
      id: c.id,
      pillar: label(c.pillar),
      pillarKey: c.pillar,
      text: c.label,
      detail: c.detail,
      confidence: c.confidence,
      status: c.status,
      res,
      test,
      ev,
      hist,
      support: support(c, idea),
      ...(c.marker ? { ghost: c.marker } : {}),
    };
  });

  const links: MapLink[] = idea.choices
    .filter((c) => c.parentId && idea.choices.some((p) => p.id === c.parentId))
    .map((c) => [c.parentId!, c.id, LINK_LABEL[c.relation ?? "pivots-from"]]);

  return {
    title: idea.title,
    description: idea.description,
    pillars: PILLARS.map((p) => label(p.key)),
    choices,
    resources,
    links,
    now: weekOf(now, idea.createdAt),
  };
}
