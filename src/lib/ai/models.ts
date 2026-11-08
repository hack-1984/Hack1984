/**
 * Model ids for this project, resolved once from the provider (see provider.ts).
 *
 * `main` does the tree and anything that needs judgement; `fast` does
 * everything that fans out (Launch Day's twenty parallel calls, query
 * writing, extraction). Keep that split whichever provider is live.
 *
 * On Anthropic, `main` is Sonnet rather than Opus as a deliberate cost
 * decision: the budget there is a fixed $7. One /api/tree is roughly $0.07
 * on Sonnet against $0.15 on Opus, and one Launch Day ~$0.02 on Haiku.
 * On OpenAI the defaults are gpt-5 / gpt-5-mini and can be overridden with
 * OPENAI_MODEL_MAIN / OPENAI_MODEL_FAST.
 */
import { MODEL_TABLE, provider } from "./provider";

export const MODELS: { readonly main: string; readonly fast: string } = MODEL_TABLE[provider()];

export type ModelId = string;
