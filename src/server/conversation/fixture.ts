/**
 * TEMPORARY stand-in for Nick's FIXTURE_IDEA (src/data/fixture-idea.ts).
 * Same ids the plan names (fixture, cus-1, rev-1, ris-1). Delete this file and
 * import from "@/data/fixture-idea" once Step 0 lands.
 */
import type { Idea } from "./deps";

export const FIXTURE_IDEA: Idea = {
  id: "fixture",
  mode: "startup",
  pitch: "CatchCast: an app that tells weekend anglers where and when the fish are biting near them.",
  createdAt: 1762500000000,
  history: [],
  research: {
    competitors: [
      { name: "Fishbrain", url: "https://fishbrain.com", summary: "Largest social fishing app; catch logs, maps and a Pro subscription." },
      { name: "Fishidy", url: "https://www.fishidy.com", summary: "Fishing maps with hotspots; premium tier for detailed charts." },
      { name: "Navionics", url: "https://www.navionics.com", summary: "Marine charts and depth maps sold by subscription." },
    ],
    complaints: [
      {
        text: "Paid for the premium fishing app and the 'best times' forecast was wrong every single weekend. Cancelled after a month.",
        url: "https://example.com/r/fishing/forecast-useless",
        where: "Reddit r/Fishing (fixture)",
      },
      {
        text: "All the good spots on these apps are crowded by Saturday because everyone sees the same hotspot map.",
        url: "https://example.com/r/bassfishing/hotspots",
        where: "Reddit r/bassfishing (fixture)",
      },
      {
        text: "Why does every fishing app need another monthly subscription? I fish six times a year.",
        url: "https://example.com/app-review/fishing-subscription",
        where: "App Store review (fixture)",
      },
    ],
    marketNotes: ["About 50 million Americans fish recreationally each year (fixture note)."],
  },
  choices: [
    { id: "cus-1", pillar: "customer", label: "Weekend anglers", sub: "Casual, 6–20 trips/yr", detail: "Recreational anglers who fish on weekends near home.", confidence: 72, status: "active", evidence: [] },
    { id: "cus-2", pillar: "customer", label: "Fishing guides", sub: "Paid daily trips", detail: "Professional guides who need reliable bite forecasts for clients.", confidence: 40, status: "active", evidence: [] },
    { id: "pro-1", pillar: "problem", label: "Wasted trips", sub: "No bites, no idea why", detail: "Casual anglers drive out and catch nothing because they guessed the spot and time.", confidence: 66, status: "active", evidence: [] },
    { id: "sol-1", pillar: "solution", label: "Bite forecast", sub: "Spot + time score", detail: "Combines weather, moon, water temperature and catch logs into an hourly bite score per spot.", confidence: 58, status: "active", evidence: [] },
    { id: "app-1", pillar: "approach", label: "Mobile app", sub: "iOS first", detail: "Native iOS app with offline maps.", confidence: 61, status: "active", evidence: [] },
    { id: "edg-1", pillar: "edge", label: "Local catch data", sub: "Crowdsourced logs", detail: "Catch logs from local users make the forecast better in each region over time.", confidence: 44, status: "active", evidence: [] },
    { id: "rea-1", pillar: "reach", label: "Bait shop QR", sub: "Counter displays", detail: "QR code displays at local bait and tackle shops.", confidence: 50, status: "active", evidence: [] },
    { id: "rev-1", pillar: "revenue", label: "$8/month premium", sub: "forecast + maps", detail: "Free basic map; premium unlocks the hourly forecast and private spots.", confidence: 46, status: "active", evidence: [] },
    { id: "ris-1", pillar: "risks", label: "Forecast accuracy", sub: "Trust breaks fast", detail: "If the forecast is wrong a few weekends in a row, users churn and leave bad reviews.", confidence: 55, status: "active", evidence: [] },
  ],
};
