import type {
  Idea,
  LaunchSummary,
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
