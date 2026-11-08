// Storage-side shapes for Idea Tree: the "shows its sources" additions.
//
// src/lib/types.ts is frozen until Step 0 lands, so nothing here edits it.
// Everything below is additive: a StoredIdea is an Idea with optional extras,
// and is assignable to Idea, so every existing route and screen keeps working.
// When Step 0 agrees these shapes, they can move into types.ts unchanged.
import { PILLAR_KEYS } from "@/lib/pillars";
import type { Choice, Evidence, Idea, PillarKey } from "@/lib/types";

/** Which search engine ran a query. */
export type SearchProvider = "tavily" | "exa";

/** Why a query was run. Each purpose has exactly one provider (see src/lib/ai). */
export type SearchPurpose =
  | "competitors"
  | "pricing"
  | "complaints"
  | "market"
  | "news"
  | "failures"
  | "similar";

/**
 * How a child choice relates to its parent.
 * - refines: a narrower version; both may be active at once.
 * - pivots-from: an alternative; adopting one implies killing the other.
 * - complements: meant to be true together (the founder chose to combine).
 * Missing with a parentId means "pivots-from", which is what the fixture and
 * the graveyard already do.
 */
export type Relation = "refines" | "pivots-from" | "complements";

/** One line in the research log: what we searched, where, and what came back. */
export interface ResearchQuery {
  id: string;
  query: string;
  purpose: SearchPurpose;
  provider: SearchProvider;
  resultCount: number;
  ms: number;
  at: number;
}

/** One web page the agent actually retrieved. The atom; everything points at it. */
export interface Source {
  id: string; // stable hash of url, see sourceId()
  url: string;
  title: string;
  snippet: string; // the text the model was shown
  provider: SearchProvider;
  purpose: SearchPurpose;
  queryId: string; // must exist in idea.queries
  score?: number;
  publishedAt?: string;
  retrievedAt: number;
}

export interface StoredEvidence extends Evidence {
  /** Must exist in idea.sources, or validateSources() drops the row. */
  sourceId?: string;
}

export interface StoredChoice extends Choice {
  relation?: Relation;
  evidence: StoredEvidence[];
}

/**
 * What the founder types into the idea probe. Two fields, no more.
 * `pitch` on the Idea is derived from these (see pitchFrom) and is what the
 * routes research; the probe fields are what the founder sees and edits.
 */
export interface Probe {
  title: string; // a name, a few words
  description: string; // the idea in the founder's words
}

/** An Idea as stored: the frozen shape plus the probe, the bibliography and the search log. */
export interface StoredIdea extends Omit<Idea, "choices">, Probe {
  choices: StoredChoice[];
  sources?: Source[];
  queries?: ResearchQuery[];
}

/** The pitch the routes research, built from the probe. Title alone if the description is empty. */
export function pitchFrom(probe: Probe): string {
  const title = probe.title.trim();
  const description = probe.description.trim();
  if (!description) return title;
  if (!title) return description;
  return `${title}: ${description}`;
}

/**
 * Wrap an Idea that came back from a route as a StoredIdea.
 * Pass the probe the founder filled in; without one (fixtures, old ideas) the
 * title is the pitch's first clause and the description is the whole pitch.
 */
export function toStored(idea: Idea, probe?: Probe): StoredIdea {
  const title = probe?.title.trim() || idea.pitch.split(/[.:!?]/)[0].trim().slice(0, 80);
  const description = probe?.description.trim() || idea.pitch;
  return { ...idea, title, description, choices: idea.choices as StoredChoice[] };
}

/** Stable id for a url, so the same page found twice is one Source. */
export function sourceId(url: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < url.length; i++) {
    h ^= url.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return `src_${h.toString(16).padStart(8, "0")}`;
}

/** 0 unsupported, 1 single source, 2 corroborated (two or more distinct domains). */
export type Support = 0 | 1 | 2;

/** Derived, never stored. "Verified" means two independent domains agree. */
export function support(choice: StoredChoice, idea: StoredIdea): Support {
  const byId = new Map((idea.sources ?? []).map((s) => [s.id, s.url]));
  const domains = new Set<string>();
  for (const e of choice.evidence) {
    const url = (e.sourceId && byId.get(e.sourceId)) || e.url;
    if (!url) continue;
    try {
      domains.add(new URL(url).hostname.replace(/^www\./, ""));
    } catch {
      /* not a url; ignore */
    }
  }
  return domains.size === 0 ? 0 : domains.size === 1 ? 1 : 2;
}

/** Mean confidence of active choices per pillar, 0-1, in fixed pillar order. For the list's bars. */
export function pillarScores(idea: Pick<Idea, "choices">): number[] {
  return PILLAR_KEYS.map((key: PillarKey) => {
    const active = idea.choices.filter((c) => c.pillar === key && c.status === "active");
    if (active.length === 0) return 0;
    return active.reduce((sum, c) => sum + c.confidence, 0) / active.length / 100;
  });
}

export interface ValidationReport {
  idea: StoredIdea;
  droppedEvidence: number;
  droppedSources: number;
}

/**
 * The one citation rule, applied once before an Idea is saved or rendered:
 *   - a Source must name a query that exists;
 *   - evidence with a sourceId must name a Source that exists;
 *   - when the Idea has a bibliography, evidence with a url must match a Source url.
 * Ideas from before the bibliography existed (no `sources`) pass through untouched.
 */
export function validateSources(input: StoredIdea): ValidationReport {
  if (!input.sources) return { idea: input, droppedEvidence: 0, droppedSources: 0 };

  const queryIds = new Set((input.queries ?? []).map((q) => q.id));
  const sources = input.sources.filter((s) => queryIds.has(s.queryId));
  const droppedSources = input.sources.length - sources.length;

  const ids = new Set(sources.map((s) => s.id));
  const urls = new Set(sources.map((s) => s.url));

  let droppedEvidence = 0;
  const choices = input.choices.map((c) => {
    const evidence = c.evidence.filter((e) => {
      if (e.sourceId) return ids.has(e.sourceId);
      if (e.url) return urls.has(e.url);
      return true; // a bare note with no url makes no citation claim
    });
    droppedEvidence += c.evidence.length - evidence.length;
    return evidence.length === c.evidence.length ? c : { ...c, evidence };
  });

  return { idea: { ...input, choices, sources }, droppedEvidence, droppedSources };
}
