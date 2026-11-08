import type { Change } from "@/ideas/applyUpdates";
import type { WireUpdate } from "@/ideas/wire";
import type { Idea } from "@/lib/types";

/** What every widget gets from the map. */
export interface WidgetCtx {
  ideaId: string;
  /** Pantry uses the labeled demo content instead of the routes. */
  isPantry: boolean;
  /** Per-widget memory saved with the map (e.g. which graves were haunted / learned). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wmem: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setWmem: (key: string, patch: Record<string, any>) => void;
  /** Current score per pillar label, e.g. { Revenue: 30 }. */
  pillarPct: Record<string, number>;
  /** The Idea to send to a route, built from the map's current state. */
  buildIdea: () => Idea;
  /** The one path into the tree. Returns what changed. */
  applyWidget: (updates: WireUpdate[], sourceLabel: string, toast?: string | false) => Change[];
  openOverview: () => void;
}
