// POSTs ideas to /api/impact and prints the logic model and its updates.
// Usage: npx tsx scripts/try-impact.ts [--mode nonprofit]   (nonprofit runs all 5 NONPROFIT_PITCHES)
import type { ImpactRes } from "../src/server/conversation/deps";
import { fixtureForMode, modeArg, NONPROFIT_PITCHES } from "./_nonprofit";
import { post } from "./_http";

async function main() {
  const mode = modeArg();
  const ideas = mode === "nonprofit" ? NONPROFIT_PITCHES : [fixtureForMode(mode)];
  for (const idea of ideas) {
    const active = new Set(idea.choices.filter((c) => c.status === "active").map((c) => c.id));
    const { ms, data } = await post<ImpactRes>("/api/impact", { idea });
    const m = data.logicModel;
    console.log(`\n=== ${idea.id} — ${ms}ms (target < 10000)`);
    console.log(`  inputs:     ${m.inputs.join(" | ")}`);
    console.log(`  activities: ${m.activities.join(" | ")}`);
    console.log(`  outputs:    ${m.outputs.join(" | ")}`);
    console.log(`  outcomes:   ${m.outcomes.join(" | ")}`);
    console.log(`  impact:     ${m.impact}`);
    m.assumptions.forEach((a) => console.log(`  assume [${a.choiceId ?? "-"}] ${a.text}`));
    m.metrics.forEach((x) => console.log(`  metric (${x.pillar}) ${x.label}: ${x.target}`));
    for (const u of data.updates) {
      const ok = active.has(u.choiceId ?? "");
      console.log(`  ${ok ? "update" : "!! bad id"} ${u.action} ${u.choiceId} ${u.delta} "${u.quote}" (${u.source})`);
    }
  }
}
main().catch((e) => (console.error(e), process.exit(1)));
