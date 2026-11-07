// Offline checks for nonprofit mode: no server, no network, no model calls.
// Usage: npx tsx scripts/check-nonprofit.ts
import assert from "node:assert/strict";
import { FIXTURE_NONPROFIT } from "../src/data/fixture-nonprofit";
import { profileFor } from "../src/lib/modes";
import { chatSystem } from "../src/server/conversation/chat";
import { extractSystem, validateUpdates } from "../src/server/conversation/extract";
import { FIXTURE_IDEA } from "../src/server/conversation/fixture";
import { mockPersonaFor } from "../src/server/conversation/mocks";
import { treeText } from "../src/server/conversation/treeText";
import { buildUpdates } from "../src/server/graveyard";
import { KNOWN_NONPROFIT_FAILURES } from "../src/server/graveyard/known-nonprofit";
import { mockRecordsFor } from "../src/server/graveyard/mocks";
import { CAUSE_TAGS } from "../src/server/graveyard/types";
import { looksLikeOutput, mockImpact, validateImpact } from "../src/server/impact";

let n = 0;
const check = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log(`ok  ${name}`);
};

check("missing or unknown mode means startup", () => {
  assert.equal(profileFor(undefined).mode, "startup");
  assert.equal(profileFor("garbage").mode, "startup");
  assert.equal(profileFor("nonprofit").mode, "nonprofit");
});

check("tree text speaks each mode's vocabulary", () => {
  const s = treeText(FIXTURE_IDEA);
  assert.match(s, /^Pitch: /);
  assert.match(s, /\] Revenue: /);
  assert.match(s, /Real competitors \(from research\):/);
  const np = treeText(FIXTURE_NONPROFIT);
  assert.match(np, /^Mission: /);
  assert.match(np, /\[rev-1\] Funding: Local foundation grant \(42\)/);
  assert.match(np, /Real peer organizations \(from research\):/);
  assert.match(np, /Real community voices \(from research, quoted data\):/);
  assert.doesNotMatch(np, /Revenue|Customer:/);
});

check("chat prompts pick the right role rules", () => {
  const funder = mockPersonaFor(FIXTURE_NONPROFIT, "investor");
  const sys = chatSystem({ idea: FIXTURE_NONPROFIT, persona: funder, messages: [] });
  assert.match(sys, /foundation program officer/);
  assert.match(sys, /how likely you are to fund this/);
  assert.doesNotMatch(sys, /seed-stage/);
  const customer = chatSystem({ idea: FIXTURE_NONPROFIT, persona: mockPersonaFor(FIXTURE_NONPROFIT, "customer"), messages: [] });
  assert.match(customer, /Never talk about price/);
  const startup = chatSystem({ idea: FIXTURE_IDEA, persona: mockPersonaFor(FIXTURE_IDEA, "investor"), messages: [] });
  assert.match(startup, /startup pressure-testing simulator/);
  assert.match(startup, /seed-stage investor/);
});

check("extractor examples follow the mode", () => {
  assert.match(extractSystem(FIXTURE_IDEA), /I'd pay \$8 for that/);
  assert.match(extractSystem(FIXTURE_NONPROFIT), /fiscal sponsor/);
  assert.doesNotMatch(extractSystem(FIXTURE_NONPROFIT), /\$8/);
});

check("extractor validation is unchanged, and nonprofit evidence names the scene", () => {
  const persona = mockPersonaFor(FIXTURE_NONPROFIT, "investor");
  const said = "We rarely fund first-year groups without a fiscal sponsor, honestly.";
  const req = {
    idea: FIXTURE_NONPROFIT,
    persona,
    source: "investor" as const,
    messages: [
      { from: "founder" as const, text: "Will you fund year one?" },
      { from: "persona" as const, text: said },
    ],
  };
  const out = validateUpdates(
    {
      assessment: "",
      changes: [
        { action: "weaken", choiceId: "rev-1", delta: -40, quote: "We rarely fund first-year groups without a fiscal sponsor", reason: "r" },
        { action: "weaken", choiceId: "nope-9", delta: -10, quote: "We rarely fund", reason: "bad id" },
        { action: "weaken", choiceId: "app-1", delta: -10, quote: "words nobody said", reason: "bad quote" },
      ],
      additions: [],
    },
    req
  );
  assert.equal(out.length, 1);
  assert.equal(out[0].delta, -25); // clamped
  assert.equal(out[0].evidence?.[0].origin, "funder meeting");
  const startupOut = validateUpdates(
    {
      assessment: "",
      changes: [{ action: "weaken", choiceId: "rev-1", delta: -10, quote: "We rarely fund first-year groups", reason: "r" }],
      additions: [],
    },
    { ...req, idea: FIXTURE_IDEA }
  );
  assert.equal(startupOut[0].evidence?.[0].origin, "investor interview");
});

check("nonprofit graveyard seeds are complete and sourced", () => {
  assert.ok(KNOWN_NONPROFIT_FAILURES.length >= 9);
  for (const k of KNOWN_NONPROFIT_FAILURES) {
    assert.ok(k.sources.length && k.sources.every((s) => /^https:\/\//.test(s)), `${k.name} needs a source`);
    assert.ok(k.causeTags.every((t) => CAUSE_TAGS.includes(t)), `${k.name} has an unknown tag`);
    assert.ok(k.died, `${k.name} needs a closing year`);
  }
});

check("nonprofit graveyard mocks haunt the nonprofit fixture", () => {
  const recs = mockRecordsFor(FIXTURE_NONPROFIT);
  assert.equal(recs[0].name, "Jane Addams Hull House Association");
  const ups = buildUpdates(recs[0], FIXTURE_NONPROFIT);
  assert.equal(ups.haunts[0].choiceId, "rev-1");
  assert.equal(ups.learns[0].newChoice?.status, "proposed");
  assert.equal(mockRecordsFor(FIXTURE_IDEA)[0].name, "MoviePass");
});

check("outputs are told apart from outcomes", () => {
  assert.ok(looksLikeOutput("40 kids attend two sessions a week"));
  assert.ok(looksLikeOutput("60 sessions held per year"));
  assert.ok(looksLikeOutput("Meals distributed to families"));
  assert.ok(!looksLikeOutput("Kids can build and explain a working app"));
  assert.ok(!looksLikeOutput("Improved school attendance"));
});

check("impact validation drops bad outcomes and ids, weakens only untested assumptions", () => {
  const res = validateImpact(
    {
      inputs: ["Mentors", "Mentors", " "],
      activities: ["Coding club"],
      outputs: ["40 kids attend weekly"],
      outcomes: [
        { text: "Kids can build a working app", kind: "change-in-people" },
        { text: "60 sessions held", kind: "change-in-people" }, // mislabeled count
        { text: "Kids feel confident", kind: "count-of-activity" },
      ],
      impact: "More kids in computing",
      assumptions: [
        { text: "Volunteers stay a semester", choiceId: "app-1", tested: false },
        { text: "Room is free on weeknights", choiceId: "edg-1", tested: true },
        { text: "Made-up link", choiceId: "zzz-1", tested: false },
        { text: "Second hit on mentors", choiceId: "app-1", tested: false },
      ],
      metrics: [
        { label: "Returning kids", target: "70%", pillar: "customer" },
        { label: "Projects", target: "3", pillar: "solution" },
        { label: "Mentors kept", target: "8/10", pillar: "approach" },
        { label: "Extra", target: "x", pillar: "risks" },
      ],
    },
    FIXTURE_NONPROFIT
  );
  assert.deepEqual(res.logicModel.inputs, ["Mentors"]);
  assert.deepEqual(res.logicModel.outcomes, ["Kids can build a working app"]);
  assert.equal(res.logicModel.assumptions[2].choiceId, undefined);
  assert.equal(res.logicModel.metrics.length, 3);
  assert.equal(res.updates.length, 1);
  assert.deepEqual(
    { id: res.updates[0].choiceId, delta: res.updates[0].delta, source: res.updates[0].source },
    { id: "app-1", delta: -5, source: "plan" }
  );
});

check("impact mock targets an active choice in both modes", () => {
  const np = mockImpact(FIXTURE_NONPROFIT);
  assert.equal(np.updates[0].choiceId, "app-1");
  assert.equal(np.updates[0].quote, "Volunteers stay at least one semester");
  const su = mockImpact(FIXTURE_IDEA);
  assert.ok(FIXTURE_IDEA.choices.some((c) => c.id === su.updates[0].choiceId && c.status === "active"));
});

console.log(`\n${n} checks passed`);
