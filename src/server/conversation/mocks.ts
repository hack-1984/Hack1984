import type { ChatReq, ChatRes, ExtractReq, Idea, Persona, PersonaRole, TreeUpdate } from "./deps";
import { FIXTURE_IDEA } from "./fixture";
import { resolveChoice } from "./util";

export function mockPersona(idea: Idea, role: PersonaRole): Persona {
  const complaint = idea.research?.complaints?.[0] ?? FIXTURE_IDEA.research.complaints[0];
  const comp = idea.research?.competitors?.[0]?.name ?? "Fishbrain";
  switch (role) {
    case "customer":
      return {
        id: "mock-cus",
        role,
        name: "Dana, weekend angler",
        blurb: "Fishes most Saturdays, paid for a premium fishing app once and cancelled when the forecast kept missing.",
        basedOn: complaint,
      };
    case "competitor":
      return { id: "mock-cmp", role, name: `CEO of ${comp} (simulated)`, blurb: `A simulated stand-in for the leadership of ${comp}.` };
    case "investor":
      return { id: "mock-inv", role, name: "Sam, seed investor", blurb: "A skeptical seed-stage investor. Why now, why you, how big." };
    case "advisor":
      return { id: "mock-adv", role, name: "Accelerator mentor", blurb: "An experienced accelerator mentor who gives direct, practical answers." };
  }
}

const REPLIES: Record<PersonaRole, string[]> = {
  customer: [
    "Hi, I'm Dana. Honestly I've been burned by fishing apps before, so what makes yours different?",
    "Okay, a forecast that actually uses local catch logs could be useful on the lake I fish.",
    "I'd never pay monthly for this. I fish maybe ten weekends a year.",
    "If it were a one-time five bucks, I'd probably try it.",
  ],
  competitor: [
    "We already have millions of anglers logging catches. Why would anyone switch?",
    "Your forecast is a feature. We could ship it in a sprint.",
    "We'd bundle it into our free tier the week you launch.",
    "The bait shop angle is clever, I'll give you that. We don't do retail.",
  ],
  investor: [
    "Why now? Fishing apps have existed for a decade.",
    "Interesting. How many weekend anglers will actually pay?",
    "Fishbrain already owns this audience. What's your wedge?",
    "Bait shop distribution is cheap. Show me retention numbers and I'll listen.",
  ],
  advisor: [
    "Start by talking to ten anglers this weekend before writing more code.",
    "Your edge depends on catch data you don't have yet. Seed it with guides.",
    "Test the price with a fake door before building premium.",
    "Bait shops are a good wedge. Pilot three and measure scans.",
  ],
};
const WOULD_BUY = [40, 55, 30, 45];

export function mockChat(req: ChatReq): ChatRes {
  const role = req.persona?.role ?? "customer";
  const i = (req.messages ?? []).filter((m) => m.from === "persona").length % 4;
  return { reply: REPLIES[role][i], wouldBuy: WOULD_BUY[i] };
}

export function mockExtract(req: ExtractReq): TreeUpdate[] {
  const now = Date.now();
  const rev = resolveChoice(req.idea, "rev-1", "revenue");
  if (!rev) return [];
  const origin = `${req.persona?.role ?? "customer"} interview`;
  const q1 = "I'd never pay monthly for this";
  const q2 = "If it were a one-time five bucks, I'd probably try it";
  return [
    {
      action: "weaken",
      choiceId: rev.id,
      delta: -14,
      reason: "Customer rejects a monthly subscription for occasional use",
      quote: q1,
      evidence: [{ type: "quote", text: q1, origin, tier: "simulated" }],
      source: req.source ?? "customer",
      at: now,
    },
    {
      action: "add",
      newChoice: {
        pillar: "revenue",
        parentId: rev.id,
        label: "One-time $5 unlock",
        sub: "Pay once, keep forever",
        detail: "A single in-app purchase that unlocks the forecast for occasional anglers.",
        confidence: 45,
        status: "proposed",
        evidence: [{ type: "quote", text: q2, origin, tier: "simulated" }],
      },
      reason: "Customer would try a small one-time price",
      quote: q2,
      evidence: [{ type: "quote", text: q2, origin, tier: "simulated" }],
      source: req.source ?? "customer",
      at: now,
    },
  ];
}
