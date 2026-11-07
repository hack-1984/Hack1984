import type { ChatReq, ChatRes, ExtractReq, Idea, Persona, PersonaRole, TreeUpdate } from "./deps";
import { FIXTURE_NONPROFIT } from "@/data/fixture-nonprofit";
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

// ---------- nonprofit mocks (FIXTURE_NONPROFIT, "CodeCorner") ----------

export function mockPersonaNonprofit(idea: Idea, role: PersonaRole): Persona {
  const complaint = idea.research?.complaints?.[0] ?? FIXTURE_NONPROFIT.research.complaints[0];
  switch (role) {
    case "customer":
      return {
        id: "mock-np-cus",
        role,
        name: "Marisol, caregiver in Riverside Homes",
        blurb: "Raises two kids on her own and works evening shifts; their school dropped its only computer class.",
        basedOn: complaint,
      };
    case "competitor":
      return {
        id: "mock-np-cmp",
        role,
        name: "Director of a youth coding nonprofit (simulated)",
        blurb: "Runs an established youth coding program across the city. Open to partnering, wary of duplication.",
      };
    case "investor":
      return {
        id: "mock-np-inv",
        role,
        name: "Program officer, community foundation",
        blurb: "Reads hundreds of proposals a year. Wants measurable outcomes and a plan for after the grant.",
      };
    case "advisor":
      return {
        id: "mock-np-adv",
        role,
        name: "Nonprofit board mentor",
        blurb: "An experienced nonprofit board member who gives direct, practical answers.",
      };
  }
}

const REPLIES_NONPROFIT: Record<PersonaRole, string[]> = {
  customer: [
    "Hi, I'm Marisol. I work until eight most nights, so who's watching the kids while they're at this club?",
    "If it's right here in the community room, that changes things. I'd send both of them.",
    "Two evenings a week is a lot. One evening I could actually make work.",
    "If you walked them home after, I'd sign them up tomorrow.",
  ],
  competitor: [
    "We already run coding clubs in four schools nearby. Have you talked to us before starting something new?",
    "Your housing partnership is the piece we don't have. We can't get rooms on site.",
    "Honestly, we could lend you a curriculum instead of you writing one from scratch.",
    "Mentor churn is what kills these programs. We lose half our volunteers by spring.",
  ],
  investor: [
    "What changes for these kids after a year, beyond showing up?",
    "We rarely fund first-year groups without a fiscal sponsor. Do you have one?",
    "Who else funds you? We don't want to be your only funder.",
    "If you can show attendance and finished projects after one semester, I'd look at a renewal.",
  ],
  advisor: [
    "Start under a fiscal sponsor so you can take grants before your own 501(c)(3) comes through.",
    "Run background checks on every mentor before the first session. Funders will ask.",
    "Pilot one evening with ten kids and count who comes back in week four.",
    "Put two people from the resident council on your advisory board early.",
  ],
};
const WOULD_BUY_NONPROFIT = [35, 50, 30, 55];

export function mockChatNonprofit(req: ChatReq): ChatRes {
  const role = req.persona?.role ?? "customer";
  const i = (req.messages ?? []).filter((m) => m.from === "persona").length % 4;
  return { reply: REPLIES_NONPROFIT[role][i], wouldBuy: WOULD_BUY_NONPROFIT[i] };
}

export function mockExtractNonprofit(req: ExtractReq): TreeUpdate[] {
  const now = Date.now();
  const rev = resolveChoice(req.idea, "rev-1", "revenue");
  if (!rev) return [];
  const origin = "funder meeting";
  const q = "We rarely fund first-year groups without a fiscal sponsor";
  const ev = [{ type: "quote" as const, text: q, origin, tier: "simulated" as const }];
  return [
    {
      action: "weaken",
      choiceId: rev.id,
      delta: -12,
      reason: "Funder won't back a first-year group without a fiscal sponsor",
      quote: q,
      evidence: ev,
      source: req.source ?? "investor",
      at: now,
    },
    {
      action: "add",
      newChoice: {
        pillar: "revenue",
        parentId: rev.id,
        label: "Fiscal sponsor first",
        sub: "Grants via sponsor",
        detail: "Apply for the first grants through an established fiscal sponsor while the 501(c)(3) application is pending.",
        confidence: 48,
        status: "proposed",
        evidence: ev,
      },
      reason: "A fiscal sponsor unlocks first-year grants",
      quote: q,
      evidence: ev,
      source: req.source ?? "investor",
      at: now,
    },
  ];
}

// ---------- mode switches used by the routes ----------

export const mockPersonaFor = (idea: Idea, role: PersonaRole) =>
  idea.mode === "nonprofit" ? mockPersonaNonprofit(idea, role) : mockPersona(idea, role);
export const mockChatFor = (req: ChatReq) => (req.idea?.mode === "nonprofit" ? mockChatNonprofit(req) : mockChat(req));
export const mockExtractFor = (req: ExtractReq) =>
  req.idea?.mode === "nonprofit" ? mockExtractNonprofit(req) : mockExtract(req);
