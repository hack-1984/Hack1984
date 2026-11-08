// The tree cache and the empty team, shared by POST /api/tree and POST /api/tree/stream
// so a pitch warmed through one route is a hit on the other (demo day's warm-cache.ts
// goes through /api/tree). Keyed on pitch + team + mode, see cacheKey() in the routes.
import type { Idea, TeamProfile } from "@/lib/types";
import { TTLCache } from "@/server/cache";

export const EMPTY_TEAM: TeamProfile = { roles: [], skills: [], tech: [] };

export const treeCache = new TTLCache<Idea>();
