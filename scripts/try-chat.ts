// Builds a persona for the fixture, plays a scripted 6-message conversation through /api/chat,
// runs /api/extract after each exchange, and prints every update with its quote.
// Usage: npx tsx scripts/try-chat.ts [customer|investor|competitor|advisor]
import type { ChatMessage, Persona, PersonaRole, TreeUpdate } from "../src/server/conversation/deps";
import { FIXTURE_IDEA as idea } from "../src/server/conversation/fixture";
import { post } from "./_http";

const role = (process.argv[2] ?? "customer") as PersonaRole;
const FOUNDER_LINES = [
  "Hi! I'm building CatchCast, an app that tells you where and when fish are biting near you.",
  "Premium is $8 a month and unlocks the hourly bite forecast and private spots.",
  "We'd get the forecast right by combining weather, moon phase and catch logs from local anglers.",
];

async function main() {
  const { data: p, ms: pms } = await post<{ persona: Persona }>("/api/persona", { idea, role, choiceId: "rev-1" });
  console.log(`persona (${pms}ms): ${p.persona.name} — ${p.persona.blurb}`);
  if (p.persona.basedOn) console.log(`  basedOn: "${p.persona.basedOn.text}"`);

  const messages: ChatMessage[] = [];
  const times: number[] = [];
  const open = await post<{ reply: string; wouldBuy: number }>("/api/chat", { idea, persona: p.persona, messages });
  times.push(open.ms);
  messages.push({ from: "persona", text: open.data.reply });
  console.log(`\n${p.persona.name} (${open.ms}ms, wouldBuy ${open.data.wouldBuy}): ${open.data.reply}`);

  for (const line of FOUNDER_LINES) {
    messages.push({ from: "founder", text: line });
    console.log(`\nFounder: ${line}`);
    const r = await post<{ reply: string; wouldBuy: number }>("/api/chat", {
      idea,
      persona: p.persona,
      messages,
      focusChoiceId: "rev-1",
    });
    times.push(r.ms);
    messages.push({ from: "persona", text: r.data.reply });
    console.log(`${p.persona.name} (${r.ms}ms, wouldBuy ${r.data.wouldBuy}): ${r.data.reply}`);

    const ex = await post<{ updates: TreeUpdate[] }>("/api/extract", {
      idea,
      messages: messages.slice(-2),
      source: role === "advisor" ? "plan" : role,
      persona: p.persona,
    });
    if (!ex.data.updates.length) console.log(`  [extract ${ex.ms}ms] no updates`);
    for (const u of ex.data.updates)
      console.log(
        `  [extract ${ex.ms}ms] ${u.action} ${u.choiceId ?? `+${u.newChoice?.label} (parent ${u.newChoice?.parentId})`} ${u.delta ?? ""} — "${u.quote}" — ${u.reason}`
      );
  }
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  console.log(`\nchat avg ${avg}ms (target < 4000)`);
}
main().catch((e) => (console.error(e), process.exit(1)));
