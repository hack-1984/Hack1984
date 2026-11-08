import OpenAI from "openai";
import { z } from "zod";
import type { AskJSONArgs } from "./askJSON";
import { openaiEffort, provider, resolveModel } from "./provider";

/**
 * askJSON on the OpenAI Responses API.
 *
 * Same contract as the Anthropic path: a typed object or a throw. The schema
 * is sent as JSON Schema with strict off, then the reply is validated with the
 * caller's Zod schema. Strict mode would reject the `.optional()` and `.max()`
 * the project's schemas use; validating ourselves keeps every schema as it is.
 * A reply that fails validation gets one retry with the errors quoted back.
 */

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    // The SDK retries 408/409/429/5xx and connection errors with backoff itself.
    client = new OpenAI({ apiKey, maxRetries: 3 });
  }
  return client;
}

export async function askJSONOpenAI<S extends z.ZodType>({
  system,
  prompt,
  schema,
  model,
  effort = "medium",
  maxTokens = 8192,
}: AskJSONArgs<S>): Promise<z.infer<S>> {
  const id = resolveModel(model, provider());
  const jsonSchema = z.toJSONSchema(schema, { io: "output", unrepresentable: "any" });

  let input = prompt;
  let lastIssue = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await openai().responses.create({
      model: id,
      instructions: system,
      input,
      max_output_tokens: maxTokens,
      reasoning: { effort: openaiEffort(effort) },
      text: { format: { type: "json_schema", name: "answer", schema: jsonSchema as Record<string, unknown>, strict: false } },
    });

    // Always check before reading content.
    if (res.status === "incomplete" && res.incomplete_details?.reason === "max_output_tokens") {
      throw new Error(`askJSON: ${id} hit max_output_tokens (${maxTokens}) before finishing`);
    }
    const refusal = res.output
      .flatMap((item) => (item.type === "message" ? item.content : []))
      .find((c) => c.type === "refusal");
    if (refusal) throw new Error(`askJSON: ${id} refused: ${refusal.refusal.slice(0, 120)}`);

    const text = res.output_text?.trim();
    if (!text) throw new Error(`askJSON: ${id} returned no text output`);

    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      lastIssue = "the reply was not valid JSON";
      input = `${prompt}\n\nYour previous reply was not valid JSON. Reply with the JSON object only.`;
      continue;
    }
    const parsed = schema.safeParse(raw);
    if (parsed.success) return parsed.data as z.infer<S>;

    lastIssue = parsed.error.issues
      .slice(0, 5)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    input = `${prompt}\n\nYour previous reply did not match the required shape (${lastIssue}). Reply again, fixing exactly those fields.`;
  }

  throw new Error(`askJSON: ${id} could not produce a valid reply — ${lastIssue}`);
}
