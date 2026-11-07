/**
 * Model ids for this project.
 *
 * The build plan specs Claude (`claude-opus-5-5` / `claude-haiku-5-5`); we run
 * Gemini instead. These two were chosen by probing the key, not from docs:
 *
 *   - every pro-tier model (gemini-4-argon, gemini-pro-latest,
 *     gemini-3.1-pro-preview) returns 429 "exceeded your current quota" on this
 *     key, so there is no pro tier available to us
 *   - gemini-3.8 / 3.7 / 3.6-flash and gemini-flash-latest return 503 "high
 *     demand" or time out more often than they succeed
 *   - gemini-2.5-flash / 2.5-pro return 404, retired for new users
 *
 * gemini-3.5-flash and -flash-lite were the only two that answered reliably.
 * Re-probe before demo day; availability moves.
 */
export const MODELS = {
  main: "gemini-3.5-flash",
  fast: "gemini-3.5-flash-lite",
} as const;

export type ModelId = (typeof MODELS)[keyof typeof MODELS];
