/**
 * Smoke test for askJSON against the real tree shape.
 * Run: npx tsx --env-file=.env.local scripts/try-askjson.ts
 */
import { z } from "zod";
import { askJSON, MODELS } from "../src/lib/ai";
import { PILLAR_KEYS } from "../src/lib/pillars";

const ChoiceOut = z.object({
  label: z.string(),
  sub: z.string(),
  detail: z.string(),
  confidence: z.number(),
  evidence: z.array(
    z.object({
      type: z.enum(["source", "quote", "competitor"]),
      text: z.string(),
      url: z.string().optional(),
    })
  ),
  feasibilityOk: z.boolean(),
  feasibilityNote: z.string(),
});

// Fixed keys force all 8 pillars to come back.
const TreeOut = z.object(
  Object.fromEntries(PILLAR_KEYS.map((k) => [k, z.array(ChoiceOut)])) as Record<
    (typeof PILLAR_KEYS)[number],
    z.ZodArray<typeof ChoiceOut>
  >
);

async function main() {
 const t0 = Date.now();
 try {
  const out = await askJSON({
    system:
      "You map a startup pitch onto eight fixed pillars. 2-4 choices per pillar. Labels 2-4 words, subs at most 4 words. Be honest about confidence - not everything is above 60.",
    prompt: "Pitch: an app that matches college students into study groups by course and schedule.",
    schema: TreeOut,
    model: MODELS.main,
    effort: "low",
    maxTokens: 8192,
  });

  const secs = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`askJSON OK in ${secs}s using ${MODELS.main}\n`);
  for (const k of PILLAR_KEYS) {
    const cs = out[k];
    console.log(`  ${k.padEnd(10)} ${String(cs.length).padStart(2)} choices   ${cs.map((c) => `${c.label} (${c.confidence})`).join(", ")}`);
  }
  const all = PILLAR_KEYS.flatMap((k) => out[k]);
  console.log(`\n  total ${all.length} choices`);
  console.log(`  confidence range ${Math.min(...all.map((c) => c.confidence))}-${Math.max(...all.map((c) => c.confidence))}`);
  console.log(`  empty pillars: ${PILLAR_KEYS.filter((k) => out[k].length === 0).join(", ") || "none"}`);
} catch (err) {
  console.error(`askJSON FAILED after ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
 }
}

main();
