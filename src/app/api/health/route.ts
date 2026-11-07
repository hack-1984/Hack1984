import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
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
    .replace(/AIza[A-Za-z0-9_-]+/g, "AIza<redacted>")
    .replace(/ya29\.[A-Za-z0-9._-]+/g, "ya29.<redacted>")
    .replace(/AQ\.[A-Za-z0-9._-]+/g, "AQ.<redacted>")
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

async function checkGemini(): Promise<Check> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, reason: "missing_key", detail: "GEMINI_API_KEY is not set" };

  try {
    const res = await new GoogleGenAI({ apiKey: key }).models.generateContent({
      model: "gemini-3.8-flash",
      contents: "Reply with OK",
    });
    return { ok: true, detail: (res.text ?? "").trim().slice(0, 40) };
  } catch (err) {
    return { ok: false, reason: "call_failed", detail: redact(err) };
  }
}

export async function GET() {
  const [tavilyCheck, geminiCheck] = await Promise.all([checkTavily(), checkGemini()]);

  return NextResponse.json(
    {
      ok: tavilyCheck.ok && geminiCheck.ok,
      tavily: tavilyCheck,
      gemini: geminiCheck,
    },
    { status: tavilyCheck.ok && geminiCheck.ok ? 200 : 503 }
  );
}
