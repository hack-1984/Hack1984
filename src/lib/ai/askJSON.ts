import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MODELS } from "./models";
import { askJSONOpenAI } from "./openai";
import { provider, resolveModel } from "./provider";

/**
 * One model call that returns schema-valid JSON.
 *
 * Signature is fixed — Tony and Greg import this. Add to it, don't change it.
 *
 * Runs on Claude or on OpenAI depending on the env (see provider.ts). The
 * Anthropic path below is unchanged; the OpenAI path lives in openai.ts.
 *
 * Keep schemas to plain objects, strings, numbers, booleans, arrays and enums,
 * and clamp numbers in your own code: the model treats ranges as suggestions.
 */

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export interface AskJSONArgs<S extends z.ZodType> {
  system: string;
  prompt: string;
  schema: S;
  model?: string;
  effort?: Effort;
  maxTokens?: number;
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
    client = new Anthropic({ apiKey });
  }
  return client;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 429, 5xx and connection errors are worth another go; 400 and 401 are not. */
function isTransient(err: unknown): boolean {
  return (
    err instanceof Anthropic.RateLimitError ||
    err instanceof Anthropic.InternalServerError ||
    err instanceof Anthropic.APIConnectionError ||
    (err instanceof Anthropic.APIError && typeof err.status === "number" && err.status >= 500)
  );
}

export async function askJSON<S extends z.ZodType>(args: AskJSONArgs<S>): Promise<z.infer<S>> {
  if (provider() === "openai") return askJSONOpenAI(args);
  return askJSONAnthropic(args);
}

async function askJSONAnthropic<S extends z.ZodType>({
  system,
  prompt,
  schema,
  model = MODELS.main,
  effort = "medium",
  maxTokens = 8192,
}: AskJSONArgs<S>): Promise<z.infer<S>> {
  model = resolveModel(model, "anthropic");
  let lastErr: unknown;

  // The SDK validates the response against the schema for us, so the only
  // retry we need here is for transient failures.
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await anthropic().messages.parse({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: "user", content: prompt }],
        output_config: {
          effort,
          format: zodOutputFormat(schema),
        },
      });

      // Always check before reading content on current models.
      if (res.stop_reason === "refusal") {
        throw new Error(
          `askJSON: ${model} refused (${res.stop_details?.category ?? "no category"})`
        );
      }
      if (res.stop_reason === "max_tokens") {
        throw new Error(`askJSON: ${model} hit max_tokens (${maxTokens}) before finishing`);
      }
      if (!res.parsed_output) {
        throw new Error(`askJSON: ${model} returned no parseable output`);
      }

      return res.parsed_output as z.infer<S>;
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || attempt === 3) throw err;
      await sleep(500 * 2 ** attempt); // 0.5s, 1s, 2s
    }
  }

  throw new Error(
    `askJSON: ${model} failed — ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
  );
}
