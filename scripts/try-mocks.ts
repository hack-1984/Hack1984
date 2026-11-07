// Hits every Tony route once per mode with its fixture. Run with MOCK_AI=1 on the server: each should be < 200ms.
// Also checks that each mode gets its own mock (nonprofit responses must not leak startup words).
import { FIXTURE_NONPROFIT } from "../src/data/fixture-nonprofit";
import { FIXTURE_IDEA } from "../src/server/conversation/fixture";
import { post } from "./_http";

const STARTUP_WORDS = /fishbrain|catchcast|angler|seed investor|\$8|monthly/i;

function calls(idea: typeof FIXTURE_IDEA): [string, unknown][] {
  return [
    ["/api/persona", { idea, role: "customer" }],
    ["/api/persona", { idea, role: "competitor" }],
    ["/api/persona", { idea, role: "investor" }],
    ["/api/persona", { idea, role: "advisor" }],
    ["/api/chat", { idea, persona: { id: "x", role: "customer", name: "Test", blurb: "" }, messages: [] }],
    ["/api/extract", { idea, messages: [{ from: "founder", text: "Hi." }, { from: "persona", text: "Hello there." }], source: "customer" }],
    ["/api/graveyard", { idea }],
    ["/api/graveyard/detail", { idea }],
    ["/api/build", { idea }],
    ["/api/impact", { idea }],
  ];
}

async function main() {
  let bad = 0;
  for (const idea of [FIXTURE_IDEA, FIXTURE_NONPROFIT]) {
    console.log(`\n--- ${idea.mode} (${idea.id})`);
    for (const [path, body] of calls(idea)) {
      try {
        const { ms, data } = await post(path, body);
        const text = JSON.stringify(data);
        const leak = idea.mode === "nonprofit" && STARTUP_WORDS.test(text);
        if (ms >= 200 || leak) bad++;
        console.log(`${leak ? "LEAK" : ms < 200 ? "OK  " : "SLOW"} ${String(ms).padStart(5)}ms ${path}  ${text.slice(0, 120)}`);
      } catch (e) {
        bad++;
        console.log(`FAIL ${path}: ${(e as Error).message}`);
      }
    }
  }
  console.log(`\n${bad ? `${bad} problem(s)` : "all OK"}`);
  if (bad) process.exit(1);
}
main();
