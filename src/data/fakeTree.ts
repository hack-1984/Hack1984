import type { Idea } from "@/lib/types";

/**
 * Hardcoded tree the /api/tree stub returns, so the frontend has something
 * shaped like a real result to render before Claude is wired up.
 * Covers all eight pillars and every status/tier the UI has to draw.
 */
const T0 = 1762500000000;

export const FAKE_TREE: Idea = {
  id: "demo-studygroup",
  mode: "startup",
  pitch: "An app that matches college students into study groups by course and schedule.",
  choices: [
    {
      id: "customer-1",
      pillar: "customer",
      label: "Intro STEM students",
      sub: "Large weed-out courses",
      detail:
        "First- and second-year students in 200+ person intro courses, where nobody knows anybody and the curve is brutal.",
      confidence: 72,
      status: "active",
      evidence: [
        {
          type: "source",
          tier: "researched",
          text: "Intro STEM courses at large publics routinely enroll 300+ students per section.",
          url: "https://example.edu/enrollment",
          origin: "research",
        },
      ],
    },
    {
      id: "customer-2",
      pillar: "customer",
      parentId: "customer-1",
      label: "Transfer students",
      sub: "Arrive mid-stream",
      detail: "Transfers land without a cohort and have the least existing social graph to lean on.",
      confidence: 41,
      status: "proposed",
      evidence: [],
    },
    {
      id: "problem-1",
      pillar: "problem",
      label: "No one to study with",
      sub: "Cohort never forms",
      detail:
        "Group work is assigned but group formation is not. Students fall back on whoever sits nearby.",
      confidence: 80,
      status: "active",
      evidence: [
        {
          type: "quote",
          tier: "real",
          text: "I posted in the course Discord twice and nobody replied.",
          origin: "customer interview 1",
        },
      ],
    },
    {
      id: "solution-1",
      pillar: "solution",
      label: "Schedule-aware matching",
      sub: "Calendar in, group out",
      detail:
        "Students import their course schedule; the app proposes a group of four with overlapping free blocks.",
      confidence: 65,
      status: "active",
      feasibility: { ok: true, note: "Calendar parsing is a solved problem; matching is a small solver." },
      evidence: [],
      plan: {
        steps: ["Import .ics", "Overlap solver", "Group invite flow"],
        done: [true, false, false],
      },
    },
    {
      id: "solution-2",
      pillar: "solution",
      parentId: "solution-1",
      label: "Open group board",
      sub: "Post and join",
      detail: "A listings board instead of matching. Cheaper to build, but it is the Discord problem again.",
      confidence: 18,
      status: "killed",
      evidence: [
        {
          type: "competitor",
          tier: "researched",
          text: "Course-specific Discords and GroupMe already occupy the open-board slot and are free.",
          origin: "research",
        },
      ],
    },
    {
      id: "approach-1",
      pillar: "approach",
      label: "Per-course rollout",
      sub: "One class first",
      detail: "Launch inside a single large course with the professor's blessing, then spread sideways.",
      confidence: 58,
      status: "active",
      evidence: [],
    },
    {
      id: "edge-1",
      pillar: "edge",
      label: "Schedule data",
      sub: "Others ask, we know",
      detail:
        "Competitors ask students when they are free. Pulling the real schedule removes the step everyone drops out at.",
      confidence: 54,
      status: "active",
      evidence: [],
      hauntedBy: "StudyBuddy",
    },
    {
      id: "reach-1",
      pillar: "reach",
      label: "Professor channel",
      sub: "Announced in class",
      detail: "One slide in the first lecture beats any amount of flyering.",
      confidence: 61,
      status: "active",
      evidence: [
        {
          type: "source",
          tier: "simulated",
          text: "Modeled 12% sign-up from a single in-class announcement.",
          origin: "simulation",
        },
      ],
    },
    {
      id: "revenue-1",
      pillar: "revenue",
      label: "Campus licence",
      sub: "Sold to advising",
      detail:
        "Student success offices already buy retention tools; this is a line item they recognize.",
      confidence: 44,
      status: "active",
      evidence: [],
    },
    {
      id: "revenue-2",
      pillar: "revenue",
      parentId: "revenue-1",
      label: "Student subscription",
      sub: "$4 a month",
      detail: "Direct-to-student pricing, which collides with every free alternative on campus.",
      confidence: 22,
      status: "proposed",
      evidence: [],
    },
    {
      id: "risks-1",
      pillar: "risks",
      label: "Empty first week",
      sub: "Cold-start kills it",
      detail: "Matching needs density. Below roughly 40 students in a course there is nothing to match.",
      confidence: 70,
      status: "active",
      evidence: [],
    },
  ],
  history: [
    {
      action: "strengthen",
      choiceId: "problem-1",
      delta: 12,
      reason: "A student described exactly this failure unprompted.",
      quote: "I posted in the course Discord twice and nobody replied.",
      source: "customer",
      at: T0,
    },
    {
      action: "kill",
      choiceId: "solution-2",
      reason: "Free course Discords already fill the open-board slot.",
      source: "competitor",
      at: T0 + 60_000,
    },
  ],
};
