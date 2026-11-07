// Offline test (no API calls): the extractor's code-side validation drops bad ids,
// non-verbatim quotes, and fixes signs / clamps deltas.
import type { ExtractReq } from "../src/server/conversation/deps";
import { validateUpdates } from "../src/server/conversation/extract";
import { FIXTURE_IDEA as idea } from "../src/server/conversation/fixture";

const req: ExtractReq = {
  idea,
  source: "customer",
  persona: { id: "t", role: "customer", name: "Dana", blurb: "" },
  messages: [
    { from: "founder", text: "Premium is $8 a month." },
    { from: "persona", text: "I’d never pay monthly for this. If it were a one-time five bucks, I'd try it." },
  ],
};

const base = { reason: "r", delta: -10 };
const raw = {
  assessment: "",
  changes: [
    { ...base, action: "weaken" as const, choiceId: "rev-1", quote: "I'd never pay monthly for this" }, // smart-quote normalised → keep
    { ...base, action: "weaken" as const, choiceId: "rev-99", quote: "I'd never pay monthly" }, // bad id → drop
    { ...base, action: "weaken" as const, choiceId: "cus-1", quote: "I hate subscriptions" }, // not said → drop
    { ...base, action: "strengthen" as const, choiceId: "pro-1", delta: -50, quote: "Premium is $8 a month" }, // founder words → drop
    { ...base, action: "weaken" as const, choiceId: "rev-1", quote: "never pay monthly" }, // duplicate choice → drop
    { ...base, action: "weaken" as const, choiceId: "ris-1", delta: 90, quote: "\"one-time five bucks\"" }, // sign fixed, clamped to -25
  ],
  additions: [
    { pillar: "revenue" as const, parentId: "rev-1", label: "One-time $5 unlock", sub: "", detail: "", confidence: 140, quote: "one-time five bucks, I'd try it", reason: "r" }, // kept as the 3rd update, confidence clamped
  ],
};

const out = validateUpdates(raw, req, 0);
const checks: [string, boolean][] = [
  ["3 updates kept (cap)", out.length === 3],
  ["rev-1 weaken kept", out[0]?.choiceId === "rev-1" && out[0]?.delta === -10],
  ["quote returned as original text (curly ’)", out[0]?.quote === "I’d never pay monthly for this"],
  ["ris-1 sign fixed + clamped", out[1]?.choiceId === "ris-1" && out[1]?.delta === -25],
  ["wrapping quotes stripped", out[1]?.quote === "one-time five bucks"],
  ["add kept with parent", out[2]?.action === "add" && out[2]?.newChoice?.parentId === "rev-1"],
  ["add confidence clamped", out[2]?.newChoice?.confidence === 100],
  ["evidence attached", out.every((u) => u.evidence?.[0]?.origin === "customer interview" && u.evidence[0].tier === "simulated")],
  ["source + at set", out.every((u) => u.source === "customer" && u.at === 0)],
];
const replyOut = validateUpdates(
  { assessment: "", changes: [{ ...base, action: "strengthen", choiceId: "rev-1", delta: 5, quote: "Premium is $8 a month" }], additions: [] },
  { ...req, source: "reply" },
  0
);
checks.push(["reply source quotes founder", replyOut.length === 1 && replyOut[0].evidence?.[0].origin === "founder reply"]);
checks.push(["bland output → zero", validateUpdates({ assessment: "", changes: [], additions: [] }, req).length === 0]);

let fail = 0;
for (const [name, ok] of checks) {
  if (!ok) fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
}
if (fail) {
  console.log(JSON.stringify(out, null, 2));
  process.exit(1);
}
