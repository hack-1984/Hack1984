// The one path from a widget result into the idea map.
//
// Every widget (Launch day, Graveyard, Customer discussion) and the map's own
// "Supports it" / "Undermines it" turn their result into TreeUpdates and call
// applyUpdates(). It writes evidence and history the same way the map always
// has, so results show in History, move pillar scores, and land in "Waiting on
// you" when they suggest a new choice.
//
// Pure: takes the map's choices + links, returns new ones plus a summary.
import { FIXTURE_IDEA } from "@/data/fixture-idea";
import { PILLARS } from "@/lib/pillars";
import type { WireUpdate } from "./wire";

/* eslint-disable @typescript-eslint/no-explicit-any */
type MapChoice = { id: string; pillar: string; text: string; res: string[]; test: string; ev: any[]; hist: any[]; ghost?: string };
type Link = [string, string, string];

export interface Change {
  /** History type written: Strengthened / Weakened / Removed / Suggested. */
  type: "Strengthened" | "Weakened" | "Removed" | "Suggested" | "Added";
  choiceId: string;
  choiceText: string;
  pillar: string;
  reason: string;
}

export interface ApplyResult {
  choices: MapChoice[];
  links: Link[];
  changes: Change[];
  /** Pillar labels touched, for the highlight. */
  pillars: string[];
}

const LABEL: Record<string, string> = Object.fromEntries(PILLARS.map((p) => [p.key, p.startup]));
const lastType = (c: MapChoice) => (c.hist.length ? c.hist[c.hist.length - 1].type : "Added");
const RANK: Record<string, number> = { Strengthened: 3, Added: 2, Weakened: 1 };

/**
 * Find the map choice an update points at. Exact id first. Otherwise (mock mode
 * returns the fishing fixture's ids, e.g. "rev-1") fall back to the strongest
 * active choice in the same pillar: MOCK FALLBACK, never needed with real routes,
 * because those receive an Idea built from this map and answer with its ids.
 */
export function resolveChoice(choices: MapChoice[], id: string | undefined, pillarHint?: string): MapChoice | undefined {
  const exact = id ? choices.find((c) => c.id === id) : undefined;
  if (exact) return exact;
  const fx = id ? FIXTURE_IDEA.choices.find((c) => c.id === id) : undefined;
  const pillar = pillarHint ?? (fx ? LABEL[fx.pillar] : undefined);
  if (!pillar) return undefined;
  return choices
    .filter((c) => c.pillar === pillar && RANK[lastType(c)] !== undefined)
    .sort((a, b) => RANK[lastType(b)] - RANK[lastType(a)])[0];
}

const host = (url?: string) => {
  if (!url) return "";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
};

export function applyUpdates(
  state: { choices: MapChoice[]; links: Link[] },
  updates: WireUpdate[],
  ctx: { week: number; sourceLabel: string }
): ApplyResult {
  let choices = state.choices.slice();
  let links = state.links.slice();
  const changes: Change[] = [];
  const touched = new Set<string>();
  const put = (c: MapChoice) => {
    choices = choices.map((x) => (x.id === c.id ? c : x));
  };

  updates.forEach((u, i) => {
    const ev0 = u.evidence?.[0];
    const evSource = [ctx.sourceLabel, ev0 && host(ev0.url)].filter(Boolean).join(" · ");

    if (u.action === "add" && u.newChoice) {
      const nc = u.newChoice;
      const pillar = LABEL[nc.pillar] ?? nc.pillar;
      // Already on the map (same label in the same pillar)? Point at it instead of duplicating.
      const dup = choices.find((c) => c.pillar === pillar && c.text.trim().toLowerCase() === nc.label.trim().toLowerCase());
      if (dup) {
        changes.push({ type: "Suggested", choiceId: dup.id, choiceText: dup.text, pillar, reason: u.reason });
        touched.add(pillar);
        return;
      }
      const id = `w${Date.now().toString(36)}${i}`;
      const type = nc.status === "proposed" ? "Suggested" : "Added";
      const parent = nc.parentId ? resolveChoice(choices, nc.parentId, pillar) : undefined;
      choices = [
        ...choices,
        {
          id,
          pillar,
          text: nc.label,
          res: [],
          test: nc.detail || u.reason,
          ev: (nc.evidence ?? u.evidence ?? []).map((e) => ({ k: "support", wk: ctx.week, text: e.text, source: [ctx.sourceLabel, host(e.url)].filter(Boolean).join(" · ") })),
          hist: [{ wk: ctx.week, type, note: u.reason }],
        },
      ];
      if (parent && type === "Suggested") links = [...links, [parent.id, id, "Proposed replacement"]];
      changes.push({ type, choiceId: id, choiceText: nc.label, pillar, reason: u.reason });
      touched.add(pillar);
      return;
    }

    const c = resolveChoice(choices, u.choiceId);
    if (!c) return;
    const st = lastType(c);
    if (st === "Removed" || st === "Suggested") return; // nothing to move on a retired or pending choice

    if (u.action === "kill") {
      put({ ...c, hist: [...c.hist, { wk: ctx.week, type: "Removed", note: u.reason }] });
      changes.push({ type: "Removed", choiceId: c.id, choiceText: c.text, pillar: c.pillar, reason: u.reason });
    } else {
      const support = u.action === "strengthen";
      const type = support ? "Strengthened" : "Weakened";
      const text = u.quote ? `“${u.quote}”` : ev0?.text ?? u.reason;
      put({
        ...c,
        ev: [...c.ev, { k: support ? "support" : "against", wk: ctx.week, text, source: evSource }],
        hist: [...c.hist, { wk: ctx.week, type, note: u.reason }],
        ...(u.action === "haunt" && u.ghost ? { ghost: u.ghost } : {}),
      });
      changes.push({ type, choiceId: c.id, choiceText: c.text, pillar: c.pillar, reason: u.reason });
    }
    touched.add(c.pillar);
  });

  return { choices, links, changes, pillars: [...touched] };
}
