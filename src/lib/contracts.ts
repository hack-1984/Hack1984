import type {
  Idea,
  LaunchSummary,
  Mode,
  PillarKey,
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
 * POST /api/impact — Tony's nonprofit Build.
 *
 * The nonprofit counterpart of /api/build: where a startup ends at a landing
 * page and a pitch, a nonprofit ends at a logic model and something a funder
 * can read. Nonprofit mode only; in startup mode the route returns 400.
 */
export interface ImpactRequest {
  idea: Idea;
}

/** One number a funder would ask for, with the reasoning that produced it. */
export interface ImpactMetric {
  label: string; // "Students served per year"
  value: string; // "120" — a string, since some are ranges or rates
  basis: string; // how it was derived, 1 sentence
  pillar: PillarKey;
}

/** Inputs -> activities -> outputs -> outcomes, the standard funder framing. */
export interface LogicModel {
  inputs: string[];
  activities: string[];
  outputs: string[];
  outcomes: string[];
}

export interface ImpactResponse {
  impact: {
    headline: string;
    metrics: ImpactMetric[];
    logicModel: LogicModel;
    /** What changes for the people served, in their terms. */
    outcomes: string[];
    /** ~250 words a programme officer could read without context. */
    funderOnePager: string;
  };
}
