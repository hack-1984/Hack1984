import type { Change } from "@/lib/db";
import type { WireUpdate } from "@/ideas/wire";
import type { Idea } from "@/lib/types";

export type { Change };

/** What every widget gets from the map. */
export interface WidgetCtx {
  ideaId: string;
  /** Per-widget memory saved with the idea (e.g. which graves were haunted / learned). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wmem: Record<string, any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setWmem: (key: string, patch: Record<string, any>) => void;
  /** Current score per pillar label, e.g. { Revenue: 30 }. */
  pillarPct: Record<string, number>;
  /** The Idea to send to a route: the stored one, exactly as the backend shaped it. */
  buildIdea: () => Idea;
  /** The one path into the tree. Returns what changed. */
  applyWidget: (updates: WireUpdate[], sourceLabel: string, toast?: string | false) => Change[];
  openOverview: () => void;
}
