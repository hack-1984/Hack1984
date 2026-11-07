// Runs /api/build on 5 pitches and prints the outputs with timing and word count.
import type { BuildRes } from "../src/server/conversation/deps";
import { post } from "./_http";
import { modeArg, NONPROFIT_PITCHES } from "./_nonprofit";
import { PITCHES as STARTUP_PITCHES } from "./_pitches";

// Add --mode nonprofit to run the five nonprofit test ideas instead.
const PITCHES = modeArg() === "nonprofit" ? NONPROFIT_PITCHES : STARTUP_PITCHES;

async function main() {
  for (const idea of PITCHES) {
    const { ms, data } = await post<BuildRes>("/api/build", { idea });
    const words = data.onePager.split(/\s+/).length;
    console.log(`\n=== ${idea.id} — ${ms}ms (target < 10000), one-pager ${words} words`);
    console.log(`  ${data.landing.headline}\n  ${data.landing.subhead}`);
    data.landing.bullets.forEach((b) => console.log(`   • ${b}`));
    console.log(`  [${data.landing.cta}]`);
    data.pitchOutline.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
  }
}
main().catch((e) => (console.error(e), process.exit(1)));
