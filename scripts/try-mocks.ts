// Hits every route once with the fixture. Run with MOCK_AI=1 on the server: each should be < 200ms.
import { FIXTURE_IDEA as idea } from "../src/server/conversation/fixture";
import { post } from "./_http";

const calls: [string, unknown][] = [
  ["/api/persona", { idea, role: "customer" }],
  ["/api/persona", { idea, role: "competitor" }],
  ["/api/chat", { idea, persona: { id: "x", role: "customer", name: "Dana", blurb: "" }, messages: [] }],
  ["/api/extract", { idea, messages: [{ from: "founder", text: "It's $8/month." }, { from: "persona", text: "I'd never pay monthly for this." }], source: "customer" }],
  ["/api/graveyard", { idea }],
  ["/api/graveyard/detail", { idea }],
  ["/api/build", { idea }],
];

async function main() {
for (const [path, body] of calls) {
  try {
    const { ms, data } = await post(path, body);
    console.log(`${ms < 200 ? "OK  " : "SLOW"} ${String(ms).padStart(5)}ms ${path}  ${JSON.stringify(data).slice(0, 140)}`);
  } catch (e) {
    console.log(`FAIL ${path}: ${(e as Error).message}`);
  }
}
}
main();
