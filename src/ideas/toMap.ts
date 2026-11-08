// Turns an Idea from /api/tree into the data the idea map draws.
//
// The map was designed around a weekly timeline of choices with history
// ("Added", "Strengthened", ...). A freshly researched idea has one week of
// history, so every choice gets a single week-1 entry whose type comes from
// the choice's status and confidence.
import { PILLARS } from "@/lib/pillars";
import type { Choice, Idea } from "@/lib/types";

export interface MapEvidence { k: "support" | "against"; wk: number; text: string; source: string }
export interface MapHist { wk: number; type: "Added" | "Strengthened" | "Weakened" | "Removed" | "Suggested"; note: string }
export interface MapChoice { id: string; pillar: string; text: string; res: string[]; test: string; ev: MapEvidence[]; hist: MapHist[] }
export interface MapResource { id: string; name: string; have: boolean }
export interface MapData {
  name: string;
  pitch: string;
  /** Last week on the timeline. */
  now: number;
  choices: MapChoice[];
  resources: MapResource[];
  /** [fromId, toId, note]: drawn as curves; a "Proposed replacement" link drives accept/reject. */
  links: [string, string, string][];
}

/** Same weights the map uses for a pillar's score. */
export const SCORE = { strengthened: 1, added: 0.6, guess: 0.4, weakened: 0.2, removed: 0 } as const;

const STRONG = 75;
const WEAK = 45;

const histType = (c: Choice): MapHist["type"] =>
  c.status === "killed" ? "Removed"
  : c.status === "proposed" ? "Suggested"
  : c.confidence >= STRONG ? "Strengthened"
  : c.confidence < WEAK ? "Weakened"
  : "Added";

const host = (url?: string) => {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export function ideaToMap(idea: Idea, name: string): MapData {
  const WK = 1;
  const label = Object.fromEntries(PILLARS.map((p) => [p.key, p.startup]));
  const choices: MapChoice[] = idea.choices.map((c) => {
    const type = histType(c);
    const next = c.plan?.steps.find((_, i) => !c.plan?.done[i]);
    return {
      id: c.id,
      pillar: label[c.pillar],
      text: c.label,
      res: [],
      test: type === "Removed" ? "—" : next ?? "No test planned yet. Talk to five people this choice depends on.",
      ev: c.evidence.map((e) => ({
        k: c.status === "killed" || e.type === "competitor" ? "against" : "support",
        wk: WK,
        text: e.text,
        source: [e.origin, host(e.url)].filter(Boolean).join(" · "),
      })),
      hist: [{ wk: WK, type, note: c.detail || c.sub }],
    };
  });
  const ids = new Set(choices.map((c) => c.id));
  const links: MapData["links"] = idea.choices
    .filter((c) => c.parentId && ids.has(c.parentId))
    .map((c) => [c.parentId as string, c.id, c.status === "proposed" ? "Proposed replacement" : "Branches from"]);
  return { name, pitch: idea.pitch, now: WK, choices, resources: [], links };
}

/** Per-pillar scores (0–1, in pillar order) the way the map computes them, for dashboard cards. */
export function ideaPillarScores(idea: Idea): number[] {
  return PILLARS.map((p) => {
    const cs = idea.choices.filter((c) => c.pillar === p.key && c.status === "active");
    if (!cs.length) return 0;
    const w = cs.map((c) => {
      const t = histType(c);
      return t === "Strengthened" ? SCORE.strengthened : t === "Weakened" ? SCORE.weakened : SCORE.added;
    });
    return w.reduce((a, b) => a + b, 0) / w.length;
  });
}
