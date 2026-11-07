// 15 hand-written exchanges against /api/extract. 5 should produce zero updates.
// Prints pass/fail per case plus false-positive and invariant counts.
// Usage: npx tsx scripts/try-extract.ts [--mode nonprofit]
import type { ChatMessage, TreeUpdate, UpdateSource } from "../src/server/conversation/deps";
import { fixtureForMode, modeArg } from "./_nonprofit";
import { post } from "./_http";

const mode = modeArg();
const idea = fixtureForMode(mode);

type Expect = "none" | { choiceId?: string; action: TreeUpdate["action"] | "any" }[];
interface Case {
  name: string;
  founder: string;
  persona: string;
  source?: UpdateSource;
  expect: Expect;
}

const STARTUP_PERSONA = { id: "t", role: "customer", name: "Dana, weekend angler", blurb: "Weekend angler, burned by a premium fishing app." };
const NONPROFIT_PERSONA = {
  id: "t",
  role: "customer",
  name: "Marisol, caregiver in Riverside Homes",
  blurb: "Raises two kids on her own and works evening shifts.",
};

// 15 nonprofit exchanges against FIXTURE_NONPROFIT ("CodeCorner"). 5 should produce zero updates.
const NONPROFIT_CASES: Case[] = [
  // ---- should change nothing ----
  { name: "greeting", founder: "Hi Marisol, thanks for making time.", persona: "Sure, the kids are at my sister's. What's this about?", expect: "none" },
  { name: "vague interest", founder: "It's a coding club for kids.", persona: "Huh, okay. What do they do there exactly?", expect: "none" },
  { name: "neutral question", founder: "It'd be in the community room.", persona: "Which nights are you thinking?", expect: "none" },
  { name: "off-topic", founder: "How old are your kids?", persona: "Twelve and nine. The little one is into drawing more than computers.", expect: "none" },
  { name: "noncommittal", founder: "Would you sign them up?", persona: "Maybe. I'd have to see what it's like first.", expect: "none" },
  // ---- should change something ----
  {
    name: "on-site validation",
    founder: "Everything happens downstairs in the community room.",
    persona: "If it's right here in the building, that changes everything. I'd send both of them.",
    expect: [{ choiceId: "edg-1", action: "strengthen" }],
  },
  {
    name: "schedule objection",
    founder: "The club runs two evenings a week.",
    persona: "Two evenings is too much with my shifts. One evening a week I could actually make work.",
    expect: [{ choiceId: "sol-1", action: "any" }],
  },
  {
    name: "need validation",
    founder: "Do the kids get any computer class at school?",
    persona: "Nothing. They cut the only computer class last year and the library closes at five.",
    expect: [{ choiceId: "pro-1", action: "strengthen" }],
  },
  {
    name: "mentor trust",
    founder: "Mentors are volunteers from tech companies.",
    persona: "I'm not leaving my kids with strangers unless they've been background checked. That's a hard line for me.",
    expect: [{ action: "any" }],
  },
  {
    name: "outreach validation",
    founder: "We'll announce it at resident council meetings.",
    persona: "Everybody goes to the council meeting, that's how we hear about anything around here.",
    expect: [{ choiceId: "rea-1", action: "strengthen" }],
  },
  {
    name: "counselor doubt",
    founder: "School counselors will refer kids.",
    persona: "The counselor at their school has four hundred kids. She's never once called me about anything.",
    expect: [{ choiceId: "rea-2", action: "weaken" }],
  },
  {
    name: "walk home add",
    founder: "Sessions end at seven thirty.",
    persona: "It's dark by then in winter. If someone walked them back to the door, I'd sign them up tomorrow.",
    expect: [{ action: "any" }],
  },
  {
    name: "caregiver need",
    founder: "Would it help you too?",
    persona: "Honestly it would be two evenings I know they're safe and not alone in the apartment while I'm at work.",
    expect: [{ action: "any" }],
  },
  {
    name: "funder objection",
    source: "investor",
    founder: "Our first year would come from your foundation grant.",
    persona: "We rarely fund first-year groups without a fiscal sponsor, and we never want to be someone's only funder.",
    expect: [{ choiceId: "rev-1", action: "weaken" }],
  },
  {
    name: "founder reply",
    source: "reply",
    founder: "Good point. We'll start under a fiscal sponsor and look for a second funder before applying.",
    persona: "We rarely fund first-year groups without a fiscal sponsor.",
    expect: [{ action: "any" }],
  },
];

const persona = mode === "nonprofit" ? NONPROFIT_PERSONA : STARTUP_PERSONA;

const STARTUP_CASES: Case[] = [
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

const CASES = mode === "nonprofit" ? NONPROFIT_CASES : STARTUP_CASES;

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
    const speakerPersona =
      source === "investor"
        ? { id: "t-inv", role: "investor", name: "Program officer, community foundation", blurb: "A skeptical foundation program officer." }
        : persona;
    const { ms, data } = await post<{ updates: TreeUpdate[] }>("/api/extract", { idea, messages, source, persona: speakerPersona });
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
