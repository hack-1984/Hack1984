// The map's FX bus. Purely visual: nothing here changes the idea or the map's state.
//
// logic.js emits one FxEvent per applyWidget() batch, after the tree has been
// updated and saved. The FX components under this folder subscribe and animate.
// Positions are never carried on events: FX code finds nodes in the DOM through
// the anchors below, at animation time, so pan/zoom never has to be reasoned about.
//
// DOM anchors (IdeaMapScreen.tsx / WidgetRail.tsx):
//   [data-node="pillar"][data-id="<pillar KEY e.g. revenue>"]
//   [data-node="choice"][data-id="<choice id e.g. rev-2>"]
//   [data-node="idea"]
//   .wg-rail-btn[data-widget="<WidgetKey>"]        the rail icon an effect shoots out of
//   the FX components are mounted in .im-stage (same box as .im-pane); they measure against their own inset:0 host
import type { HistType } from "@/lib/db";
import type { PillarKey, UpdateSource } from "@/lib/types";
import type { WidgetKey } from "../widgets/WidgetRail";

export interface FxChange {
  /** What the map says happened: Strengthened, Weakened, Added, Suggested, Removed. */
  type: HistType;
  action: "strengthen" | "weaken" | "kill" | "add" | "haunt";
  choiceId: string;
  choiceText: string;
  pillar: PillarKey;
  /** The label on screen for that pillar in this idea's mode ("Revenue" or "Funding"). */
  pillarLabel: string;
  reason: string;
  /** Confidence 0-100 before and after. Equal when the action did not move it (add/kill). */
  confBefore: number;
  confAfter: number;
  /** How many evidence rows the update appended to the choice. */
  evidenceAdded: number;
  /** The pillar's score 0-100 before and after this batch (same for every change in one pillar). */
  pillarBefore: number;
  pillarAfter: number;
  /** Haunts only: the dead startup's name. */
  ghost?: string;
}

export interface FxEvent {
  key: number;
  at: number;
  /** As the widget labelled itself: "Customer · Dana", "Graveyard · MoviePass", "Launch Day · $8", "Team check", "Research", "Added by you". */
  sourceLabel: string;
  /** The first update's source field. */
  source: UpdateSource;
  /** The rail icon to launch from. null when the change came from the map itself (Research, Added by you). */
  sourceWidget: WidgetKey | null;
  changes: FxChange[];
  /** Overall confidence 0-100 before and after. */
  overallBefore: number;
  overallAfter: number;
}

type Listener = (e: FxEvent) => void;
const listeners = new Set<Listener>();
let recent: FxEvent[] = [];
const KEEP = 40;

export function emitFx(e: FxEvent) {
  recent = [...recent.slice(-(KEEP - 1)), e];
  listeners.forEach((l) => {
    try {
      l(e);
    } catch (err) {
      console.warn("[fx]", err);
    }
  });
}

/** Subscribe; returns an unsubscribe. `replay` delivers events already emitted this page (for late mounts). */
export function subscribeFx(l: Listener, replay = false): () => void {
  listeners.add(l);
  if (replay) recent.forEach(l);
  return () => {
    listeners.delete(l);
  };
}

export function recentFx(): FxEvent[] {
  return recent;
}

/** Which rail icon an update source lives behind. */
export const WIDGET_FOR_SOURCE: Record<UpdateSource, WidgetKey | null> = {
  customer: "customer",
  competitor: "customer",
  investor: "customer",
  launch: "launch",
  graveyard: "graveyard",
  feasibility: "team",
  research: null,
  plan: null,
};

/** Theme colour for a change type. */
export const FX_COLOR: Record<HistType, string> = {
  Strengthened: "var(--green)",
  Added: "var(--accent)",
  Suggested: "var(--accent)",
  Weakened: "var(--red)",
  Removed: "var(--muted)",
};

// Dev only: fire synthetic events from the console to tune the FX without touching an idea.
//   __emitFx({ key: Date.now(), at: Date.now(), sourceLabel: "Customer · Dana", source: "customer", sourceWidget: "customer",
//     changes: [{ type: "Weakened", action: "weaken", choiceId: "rev-1", choiceText: "$8 monthly", pillar: "revenue", pillarLabel: "Revenue",
//       reason: "…", confBefore: 38, confAfter: 24, evidenceAdded: 1, pillarBefore: 60, pillarAfter: 45 }], overallBefore: 65, overallAfter: 62 })
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __emitFx?: typeof emitFx }).__emitFx = emitFx;
}
