/**
 * Which model provider the backend talks to.
 *
 * Both are wired; the choice is made once at server start from the env:
 *   AI_PROVIDER=openai | anthropic   explicit, wins over everything
 *   otherwise: openai when OPENAI_API_KEY is set and ANTHROPIC_API_KEY is not,
 *   anthropic in every other case (the original setup).
 *
 * Nothing outside src/lib/ai should care: askJSON() and MODELS are the same
 * shape on both, and every caller goes through them.
 */
import type { Effort } from "./askJSON";

export type Provider = "anthropic" | "openai";

export function provider(): Provider {
  const forced = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (forced === "openai" || forced === "anthropic") return forced;
  if (process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) return "openai";
  return "anthropic";
}

/**
 * Model ids per provider. The OpenAI ids can be overridden with
 * OPENAI_MODEL_MAIN / OPENAI_MODEL_FAST without a code change, since OpenAI
 * ships new ids often and the hackathon credit may favour a specific one.
 * Both defaults are reasoning models, which the `effort` setting needs.
 */
export const MODEL_TABLE = {
  anthropic: { main: "claude-sonnet-5-5", fast: "claude-haiku-5-5" },
  openai: {
    main: process.env.OPENAI_MODEL_MAIN?.trim() || "gpt-5",
    fast: process.env.OPENAI_MODEL_FAST?.trim() || "gpt-5-mini",
  },
} as const satisfies Record<Provider, { main: string; fast: string }>;

/**
 * A caller that hard-coded a Claude id (none do today, but scripts might)
 * still gets a sensible OpenAI model: Haiku-class → fast, everything else → main.
 */
export function resolveModel(requested: string | undefined, p: Provider): string {
  const table = MODEL_TABLE[p];
  if (!requested) return table.main;
  const isClaude = requested.startsWith("claude-");
  const isOpenAI = /^(gpt-|o\d)/.test(requested);
  if (p === "openai" && isClaude) return requested.includes("haiku") ? table.fast : table.main;
  if (p === "anthropic" && isOpenAI) return /mini|nano/.test(requested) ? table.fast : table.main;
  return requested;
}

/** Anthropic's effort scale onto OpenAI's reasoning effort. */
export function openaiEffort(e: Effort): "low" | "medium" | "high" {
  return e === "low" ? "low" : e === "medium" ? "medium" : "high";
}
