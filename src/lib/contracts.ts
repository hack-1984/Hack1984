import type {
  Idea,
  LaunchSummary,
  Mode,
  SceneSpec,
  SimPersona,
  SimResult,
  TeamProfile,
  TreeUpdate,
} from "./types";

/**
 * Request/response shapes for Nick's routes.
 *
 * Specified by Step 0 and never changed after it: Ethan's intake and Launch Day
 * screens and Greg's Team drawer are written against exactly these. Routes are
 * stateless — the client sends the whole Idea (or a pitch) every time.
 */

/** POST /api/tree — Ethan's intake */
export interface TreeRequest {
  pitch: string;
  team: TeamProfile;
  /** Omitted means "startup", so the startup pipeline is unchanged. */
  mode?: Mode;
}
export interface TreeResponse {
  idea: Idea;
}

/** POST /api/feasibility — Greg's Team drawer. Each update carries .feasibility */
export interface FeasibilityRequest {
  idea: Idea;
  team: TeamProfile;
}
export interface FeasibilityResponse {
  updates: TreeUpdate[];
}

/** POST /api/launch/scene — Ethan's Launch Day */
export interface LaunchSceneRequest {
  idea: Idea;
}
export interface LaunchSceneResponse {
  scene: SceneSpec;
}

/** POST /api/launch/personas — Ethan's Launch Day */
export interface LaunchPersonasRequest {
  idea: Idea;
  scene: SceneSpec;
}
export interface LaunchPersonasResponse {
  personas: SimPersona[];
}

/** POST /api/launch/run — Ethan's Launch Day */
export interface LaunchRunRequest {
  idea: Idea;
  scene: SceneSpec;
  personas: SimPersona[];
  price: number;
}
export interface LaunchRunResponse {
  results: SimResult[];
  summary: LaunchSummary;
  updates: TreeUpdate[];
}

/**
 * POST /api/impact — Tony's nonprofit Build. { idea } -> { logicModel, updates }
 *
 * The nonprofit counterpart of /api/build: where a startup ends at a landing
 * page and a pitch, a nonprofit ends at a logic model a funder can read.
 *
 * Tony owns the route AND its types, which live beside his other conversation
 * contracts in src/server/conversation/deps.ts. These are re-exports, not a
 * second definition: a shape declared in two files drifts, and this one
 * already had — the placeholder written here during Step 0N guessed at
 * `{ impact: {...} }` and the shipped route answers `{ logicModel, updates }`.
 */
export type {
  ImpactReq as ImpactRequest,
  ImpactRes as ImpactResponse,
  LogicModel,
} from "@/server/conversation/deps";
