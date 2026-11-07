import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { tavily } from "@tavily/core";

/**
 * TEMPORARY health check. Verifies both API keys work. Delete before the demo.
 * Never returns key material — see redact().
 */

type Check =
  | { ok: true; detail: string }
  | { ok: false; reason: "missing_key" | "call_failed"; detail: string };

/** Strip anything key-shaped out of a message before it leaves the server. */
function redact(input: unknown): string {
  const msg = input instanceof Error ? input.message : String(input);
  return msg
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "sk-ant-<redacted>")
    .replace(/tvly-[A-Za-z0-9_-]+/g, "tvly-<redacted>")
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, "<redacted>")
    .slice(0, 300);
}

async function checkTavily(): Promise<Check> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) return { ok: false, reason: "missing_key", detail: "TAVILY_API_KEY is not set" };

  try {
    const res = await tavily({ apiKey: key }).search("test");
    return { ok: true, detail: `${res.results?.length ?? 0} results` };
  } catch (err) {
    return { ok: false, reason: "call_failed", detail: redact(err) };
  }
}

async function checkAnthropic(): Promise<Check> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, reason: "missing_key", detail: "ANTHROPIC_API_KEY is not set" };

  try {
    const res = await new Anthropic({ apiKey: key }).messages.create({
      model: "claude-opus-5-5",
      max_tokens: 1024,
      output_config: { effort: "low" },
      messages: [{ role: "user", content: "Reply with OK" }],
    });

    if (res.stop_reason === "refusal") {
      return { ok: false, reason: "call_failed", detail: "model refused" };
    }

    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

    return { ok: true, detail: text.slice(0, 40) };
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return { ok: false, reason: "call_failed", detail: "key rejected (401)" };
    }
    if (err instanceof Anthropic.RateLimitError) {
      return { ok: false, reason: "call_failed", detail: "rate limited (429)" };
    }
    return { ok: false, reason: "call_failed", detail: redact(err) };
  }
}

export async function GET() {
  const [tavilyCheck, anthropicCheck] = await Promise.all([checkTavily(), checkAnthropic()]);

  return NextResponse.json(
    {
      ok: tavilyCheck.ok && anthropicCheck.ok,
      tavily: tavilyCheck,
      anthropic: anthropicCheck,
    },
    { status: tavilyCheck.ok && anthropicCheck.ok ? 200 : 503 }
  );
}
