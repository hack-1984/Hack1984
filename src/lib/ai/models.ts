/**
 * Model ids for this project.
 *
 * Back on Claude, as the build plan specifies. We ran on Gemini for a while
 * because we had no Anthropic key; that key's free tier capped at 20 requests
 * per day per model, which died after six pitches. See git history.
 *
 * `main` is Sonnet rather than Opus as a deliberate cost decision — the budget
 * is a fixed $7 of credits. Measured shapes put one /api/tree at roughly
 * $0.07 on Sonnet against $0.15 on Opus, and one Launch Day at ~$0.02 on
 * Haiku against ~$0.84 on Opus. If the budget grows, raising `main` to
 * "claude-opus-5-5" is a one-line change and needs nothing else.
 */
export const MODELS = {
  main: "claude-sonnet-5-5",
  fast: "claude-haiku-5-5",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];
