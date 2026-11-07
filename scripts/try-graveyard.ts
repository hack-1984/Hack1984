// Runs /api/graveyard then /api/graveyard/detail on 5 pitches; the second call should hit the cache.
// Usage: npx tsx scripts/try-graveyard.ts [ideaId]
import type { GraveyardRes } from "../src/server/conversation/deps";
import type { GraveyardDetailRes } from "../src/server/graveyard/types";
import { post } from "./_http";
import { PITCHES } from "./_pitches";

async function main() {
  const only = process.argv[2];
  for (const idea of PITCHES.filter((p) => !only || p.id === only)) {
    console.log(`\n=== ${idea.id}: ${idea.pitch}`);
    const g = await post<GraveyardRes>("/api/graveyard", { idea });
    const d = await post<GraveyardDetailRes>("/api/graveyard/detail", { idea });
    console.log(`graveyard ${g.ms}ms (target < 20000) · detail ${d.ms}ms (should be cached) · adjacent=${g.data.adjacent}`);
    for (const gr of g.data.graves) {
      console.log(`  ☠ ${gr.name} ${gr.years} ${gr.raised ?? ""} sim=${gr.similarity} threatens=${gr.threatens}`);
      console.log(`    "${gr.epitaph}" — ${gr.story}`);
      console.log(`    haunt ${gr.haunt.choiceId} ${gr.haunt.delta} · learn +"${gr.learn.newChoice?.label}"`);
      console.log(`    sources: ${gr.sources.join(" , ")}`);
    }
    const same =
      JSON.stringify(g.data.graves.map((x) => x.name)) === JSON.stringify(d.data.records.map((x) => x.name));
    console.log(`  same records in both routes: ${same}`);
  }
}
main().catch((e) => (console.error(e), process.exit(1)));
