import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { MODELS } from "./models";

/**
 * One model call that returns schema-valid JSON.
 *
 * Signature is fixed — Tony and Greg import this. Add to it, don't change it.
 *
 * Keep schemas to plain objects, strings, numbers, booleans, arrays and enums,
 * and clamp numbers in your own code: the model treats ranges as suggestions.
 */

export type Effort = "low" | "medium" | "high";

export interface AskJSONArgs<S extends z.ZodType> {
  system: string;
  prompt: string;
  schema: S;
  model?: string;
  effort?: Effort;
  maxTokens?: number;
}

const THINKING: Record<Effort, ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

let client: GoogleGenAI | null = null;
function genai(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/** Gemini rejects some JSON Schema keywords that Zod emits. */
function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { io: "output" }) as Record<string, unknown>;
  const strip = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(strip);
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) {
        if (k === "$schema" || k === "additionalProperties" || k === "exclusiveMinimum" || k === "exclusiveMaximum") continue;
        out[k] = strip(v);
      }
      return out;
    }
    return node;
  };
  return strip(json) as Record<string, unknown>;
}

const TRANSIENT = /\b(429|500|502|503|504|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|timed out|timeout)\b/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Two kinds of retry, deliberately separate:
 *   - transient (503 "high demand", 429, timeouts) — common on this key, backs off
 *   - schema-invalid output — one retry, as the plan specifies
 */
export async function askJSON<S extends z.ZodType>({
  system,
  prompt,
  schema,
  model = MODELS.main,
  effort = "medium",
  maxTokens = 8192,
}: AskJSONArgs<S>): Promise<z.infer<S>> {
  const config = {
    systemInstruction: system,
    responseMimeType: "application/json",
    responseSchema: toGeminiSchema(schema),
    maxOutputTokens: maxTokens,
    thinkingConfig: { thinkingLevel: THINKING[effort] },
  };

  let lastErr: unknown;

  // schema attempts: the call, then one retry on invalid output
  for (let attempt = 0; attempt < 2; attempt++) {
    const contents =
      attempt === 0
        ? prompt
        : `${prompt}\n\nYour previous reply did not match the required JSON schema. Return only valid JSON matching it exactly.`;

    // transient attempts, with backoff
    let raw: string | undefined;
    for (let t = 0; t < 4; t++) {
      try {
        const res = await genai().models.generateContent({ model, contents, config });
        raw = res.text ?? "";
        break;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        if (!TRANSIENT.test(msg) || t === 3) throw err;
        await sleep(400 * 2 ** t); // 400ms, 800ms, 1.6s
      }
    }

    if (raw === undefined) continue;

    try {
      return schema.parse(JSON.parse(raw)) as z.infer<S>;
    } catch (err) {
      lastErr = err;
    }
  }

  throw new Error(
    `askJSON: no schema-valid response from ${model} — ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`
  );
}
