import type { Idea } from "@/lib/types";

/**
 * PLACEHOLDER. Step 0 of the master doc specifies the canonical FIXTURE_IDEA
 * (a fishing app with id "fixture") and will overwrite this file. Written here
 * so the route mocks can land before Step 0 does.
 */
export const FIXTURE_IDEA: Idea = {
  id: "fixture",
  mode: "startup",
  pitch: "An app that tells you where the fish are biting today.",
  createdAt: 1762500000000,
  research: {
    competitors: [
      { name: "Fishbrain", url: "https://fishbrain.com", summary: "Social fishing app with catch logging and maps." },
      { name: "Navionics", url: "https://navionics.com", summary: "Paid marine charts, strong with boat owners." },
    ],
    complaints: [
      { text: "Every spot on there is five years out of date.", url: "https://reddit.com/r/fishing/1", where: "r/fishing" },
      { text: "I just want to know if it's worth driving an hour.", url: "https://reddit.com/r/fishing/2", where: "r/fishing" },
    ],
    marketNotes: [
      "Roughly 50 million people fish recreationally in the US each year.",
      "Licence sales spike in spring, so launch timing matters.",
    ],
  },
  choices: [
    { id: "cus-1", pillar: "customer", label: "Weekend anglers", sub: "Drive to fish", detail: "People who fish a handful of weekends a year and hate wasting the trip.", confidence: 74, status: "active", evidence: [{ type: "source", text: "Roughly 50 million people fish recreationally in the US each year.", url: "https://example.com/market", origin: "research", tier: "researched" }] },
    { id: "cus-2", pillar: "customer", parentId: "cus-1", label: "Charter captains", sub: "Fish for a living", detail: "Professionals who already know the water but want to defend their picks to clients.", confidence: 38, status: "proposed", evidence: [] },
    { id: "pro-1", pillar: "problem", label: "Wasted trips", sub: "Drive, catch nothing", detail: "An hour each way and nothing to show for it. The main reason casual anglers stop going.", confidence: 81, status: "active", evidence: [{ type: "quote", text: "I just want to know if it's worth driving an hour.", url: "https://reddit.com/r/fishing/2", origin: "research", tier: "researched" }] },
    { id: "sol-1", pillar: "solution", label: "Daily bite forecast", sub: "One number", detail: "A single score per spot per day, from weather, water temperature and recent catches.", confidence: 66, status: "active", feasibility: { ok: true, note: "Weather and tide APIs are public and free at this volume." }, evidence: [], plan: { steps: ["Pull NOAA feed", "Score model", "Spot pages"], done: [true, false, false] } },
    { id: "sol-2", pillar: "solution", parentId: "sol-1", label: "Social catch log", sub: "Users post catches", detail: "Fishbrain already owns this and it needs density we will not have on day one.", confidence: 19, status: "killed", evidence: [{ type: "competitor", text: "Fishbrain is an established social fishing app with catch logging.", url: "https://fishbrain.com", origin: "research", tier: "researched" }] },
    { id: "app-1", pillar: "approach", label: "One lake first", sub: "Prove it locally", detail: "Nail forecast quality on a single popular lake before widening.", confidence: 62, status: "active", evidence: [] },
    { id: "edg-1", pillar: "edge", label: "Freshness", sub: "Today, not archive", detail: "Competitors show historic spots. The complaint in every thread is that the data is stale.", confidence: 57, status: "active", evidence: [{ type: "quote", text: "Every spot on there is five years out of date.", url: "https://reddit.com/r/fishing/1", origin: "research", tier: "researched" }] },
    { id: "rea-1", pillar: "reach", label: "Bait shop flyers", sub: "Where anglers are", detail: "Local tackle shops reach exactly the people who are about to go fishing.", confidence: 49, status: "active", evidence: [] },
    { id: "rev-1", pillar: "revenue", label: "$8 monthly", sub: "Season subscription", detail: "Charge during the months people actually fish rather than year round.", confidence: 52, status: "active", evidence: [] },
    { id: "rev-2", pillar: "revenue", parentId: "rev-1", label: "Shop partnerships", sub: "Paid placement", detail: "Tackle shops pay to appear beside the spots nearest them.", confidence: 31, status: "proposed", evidence: [] },
    { id: "ris-1", pillar: "risks", label: "Forecast is wrong", sub: "Trust dies fast", detail: "One bad weekend and the user never opens it again. Accuracy is the whole product.", confidence: 77, status: "active", evidence: [] },
  ],
  history: [],
};
