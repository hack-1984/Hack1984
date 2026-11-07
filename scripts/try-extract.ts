// 15 hand-written exchanges against /api/extract. 5 should produce zero updates.
// Prints pass/fail per case plus false-positive and invariant counts.
import type { ChatMessage, TreeUpdate, UpdateSource } from "../src/server/conversation/deps";
import { FIXTURE_IDEA as idea } from "../src/server/conversation/fixture";
import { post } from "./_http";

type Expect = "none" | { choiceId?: string; action: TreeUpdate["action"] | "any" }[];
interface Case {
  name: string;
  founder: string;
  persona: string;
  source?: UpdateSource;
  expect: Expect;
}

const persona = { id: "t", role: "customer", name: "Dana, weekend angler", blurb: "Weekend angler, burned by a premium fishing app." };

const CASES: Case[] = [
  // ---- should change nothing ----
  { name: "greeting", founder: "Hi Dana, thanks for chatting!", persona: "Sure, happy to help. What's the app?", expect: "none" },
  { name: "vague interest", founder: "It's a bite forecast app.", persona: "Hmm, interesting. Tell me more about how it works.", expect: "none" },
  { name: "neutral question", founder: "We show the best spots near you.", persona: "Which lakes would it cover?", expect: "none" },
  { name: "off-topic", founder: "Do you fish often?", persona: "Mostly Saturdays, weather permitting. My brother usually drives.", expect: "none" },
  { name: "noncommittal", founder: "Would you try it?", persona: "Maybe, I'm not sure yet. I'd have to see it.", expect: "none" },
  // ---- should change something ----
  { name: "price rejection", founder: "Premium is $8 a month.", persona: "I'd never pay monthly for this. I fish maybe ten weekends a year.", expect: [{ choiceId: "rev-1", action: "weaken" }] },
  {
    name: "kill + replacement",
    founder: "So the $8/month plan is a no?",
    persona: "A monthly subscription is a hard no for me, period. If it were a one-time five bucks, I'd buy it today.",
    expect: [{ choiceId: "rev-1", action: "any" }, { action: "add" }],
  },
  {
    name: "problem validation",
    founder: "Do you ever drive out and catch nothing?",
    persona: "All the time. Last month I burned three Saturdays and a tank of gas on a lake that was dead.",
    expect: [{ choiceId: "pro-1", action: "strengthen" }],
  },
  {
    name: "forecast distrust",
    founder: "Our forecast predicts the bite hour by hour.",
    persona: "The last app's forecast was wrong every weekend. I don't trust any fishing forecast anymore.",
    expect: [{ action: "any" }],
  },
  {
    name: "reach validation",
    founder: "We'd put QR codes at bait shops.",
    persona: "Honestly I'd scan that, I'm at Hook & Line every Friday picking up minnows.",
    expect: [{ choiceId: "rea-1", action: "strengthen" }],
  },
  {
    name: "competitor switching cost",
    founder: "Why wouldn't you switch from Fishbrain?",
    persona: "I've got four years of catches logged in Fishbrain. I'm not starting over in a new app.",
    expect: [{ action: "any" }],
  },
  {
    name: "edge validation",
    founder: "Local anglers log catches and it gets smarter.",
    persona: "If guys on my lake were logging real catches, that would actually beat the generic maps. I'd log mine too.",
    expect: [{ choiceId: "edg-1", action: "strengthen" }],
  },
  {
    name: "offline need",
    founder: "It's an iOS app.",
    persona: "No signal on half the lakes I fish, so if it doesn't work offline it's useless to me.",
    expect: [{ action: "any" }],
  },
  {
    name: "guides add",
    founder: "Who else should use it?",
    persona: "Guides would pay real money for this. My buddy runs charters and spends hours scouting before every trip.",
    expect: [{ action: "any" }],
  },
  {
    name: "founder reply",
    source: "reply",
    founder: "Fair point. We'll switch to a one-time $5 unlock instead of the monthly plan.",
    persona: "I'd never pay monthly for this.",
    expect: [{ action: "any" }],
  },
];

async function main() {
  let fp = 0,
    fn = 0,
    pass = 0,
    invariantErrors = 0;
  const active = new Set(idea.choices.filter((c) => c.status === "active").map((c) => c.id));
  for (const c of CASES) {
    const messages: ChatMessage[] = [
      { from: "founder", text: c.founder },
      { from: "persona", text: c.persona },
    ];
    const source = c.source ?? "customer";
    const { ms, data } = await post<{ updates: TreeUpdate[] }>("/api/extract", { idea, messages, source, persona });
    const ups = data.updates;
    const speaker = source === "reply" ? c.founder : c.persona;
    for (const u of ups) {
      if (u.action !== "add" && !active.has(u.choiceId ?? "")) {
        invariantErrors++;
        console.log(`  !! bad id ${u.choiceId}`);
      }
      if (!u.quote || !speaker.toLowerCase().includes(u.quote.toLowerCase())) {
        invariantErrors++;
        console.log(`  !! quote not verbatim: "${u.quote}"`);
      }
    }
    let ok: boolean;
    if (c.expect === "none") {
      ok = ups.length === 0;
      if (!ok) fp++;
    } else {
      ok = c.expect.every((e) =>
        ups.some((u) => (e.action === "any" || u.action === e.action) && (!e.choiceId || u.choiceId === e.choiceId))
      );
      if (!ups.length) fn++;
    }
    if (ok) pass++;
    console.log(`${ok ? "PASS" : "FAIL"} ${String(ms).padStart(5)}ms ${c.name}`);
    for (const u of ups)
      console.log(`       ${u.action} ${u.choiceId ?? `+"${u.newChoice?.label}" parent=${u.newChoice?.parentId}`} ${u.delta ?? ""} "${u.quote}"`);
  }
  console.log(`\n${pass}/${CASES.length} pass · false positives ${fp}/5 · missed ${fn}/10 · invariant errors ${invariantErrors}`);
}
main().catch((e) => (console.error(e), process.exit(1)));
