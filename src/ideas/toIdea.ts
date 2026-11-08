// Builds the Idea the backend routes expect from the map's current state.
//
// The map keeps choices as a week-by-week history; routes want an Idea with a
// confidence per choice. Sent fresh on every widget call, so the backend always
// sees the founder's latest edits, and its updates come back with these ids.
import { PILLARS } from "@/lib/pillars";
import type { Choice, Idea, PillarKey } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const KEY: Record<string, PillarKey> = Object.fromEntries(PILLARS.map((p) => [p.startup, p.key]));
const CONF: Record<string, number> = { Strengthened: 80, Added: 60, Weakened: 30, Suggested: 40, Removed: 15 };

export function mapToIdea(input: {
  id: string;
  pitch: string;
  choices: any[];
  links: [string, string, string][];
  base?: Idea;
}): Idea {
  const parentOf = Object.fromEntries(input.links.map(([from, to]) => [to, from]));
  const choices: Choice[] = input.choices.map((c) => {
    const last = c.hist.length ? c.hist[c.hist.length - 1] : { type: "Added", note: "" };
    return {
      id: c.id,
      pillar: KEY[c.pillar] ?? "risks",
      ...(parentOf[c.id] ? { parentId: parentOf[c.id] } : {}),
      label: c.text,
      sub: "",
      detail: last.note || c.text,
      confidence: CONF[last.type] ?? 50,
      status: last.type === "Removed" ? "killed" : last.type === "Suggested" ? "proposed" : "active",
      evidence: c.ev.map((e: any) => ({
        type: "source" as const,
        text: e.text,
        origin: e.source || "founder",
        tier: /added by you/i.test(e.source || "") ? ("real" as const) : ("researched" as const),
      })),
    };
  });
  return {
    id: input.id,
    mode: input.base?.mode ?? "startup",
    pitch: input.pitch,
    choices,
    history: [],
    research: input.base?.research ?? { competitors: [], complaints: [], marketNotes: [] },
    createdAt: input.base?.createdAt ?? Date.now(),
  };
}
