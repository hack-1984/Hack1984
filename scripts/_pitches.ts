// Five ideas for graveyard/build runs: the fixture plus four edited copies.
import type { Idea } from "../src/server/conversation/deps";
import { FIXTURE_IDEA } from "../src/server/conversation/fixture";

function variant(id: string, pitch: string, labels: Record<string, [string, string]>, competitors: string[]): Idea {
  return {
    ...FIXTURE_IDEA,
    id,
    pitch,
    research: {
      competitors: competitors.map((name) => ({ name, summary: `${name} (test competitor)` })),
      complaints: [],
      marketNotes: [],
    },
    choices: FIXTURE_IDEA.choices.map((c) =>
      labels[c.id] ? { ...c, label: labels[c.id][0], sub: labels[c.id][1], detail: labels[c.id][1] } : c
    ),
  };
}

export const PITCHES: Idea[] = [
  FIXTURE_IDEA,
  variant(
    "meal-kit",
    "Weekly meal kits for college students with dorm-friendly recipes.",
    {
      "cus-1": ["College students", "Dorm residents"],
      "rev-1": ["$40/week box", "subscription"],
      "sol-1": ["Dorm meal kits", "No-stove recipes"],
      "pro-1": ["Eating badly", "No kitchen, no time"],
    },
    ["HelloFresh", "Blue Apron"]
  ),
  variant(
    "pet-sit",
    "An on-demand app to book vetted dog sitters within the hour.",
    {
      "cus-1": ["Urban dog owners", "Busy professionals"],
      "rev-1": ["20% booking fee", "per booking"],
      "sol-1": ["On-demand sitters", "Book in an hour"],
      "edg-1": ["Vetting process", "Background checks"],
    },
    ["Rover", "Wag"]
  ),
  variant(
    "smart-bottle",
    "A smart water bottle that tracks hydration and nudges you to drink.",
    {
      "cus-1": ["Fitness enthusiasts", "Gym regulars"],
      "rev-1": ["$59 hardware", "one-time sale"],
      "sol-1": ["Sensor bottle", "Glow reminders"],
      "app-1": ["Hardware + app", "Bluetooth"],
    },
    ["HidrateSpark"]
  ),
  variant(
    "local-social",
    "A social app for meeting people nearby who share your hobbies.",
    {
      "cus-1": ["New city movers", "20-somethings"],
      "rev-1": ["Freemium", "$5/month boosts"],
      "sol-1": ["Hobby matching", "Nearby meetups"],
      "edg-1": ["Interest graph", "Hobby-first"],
    },
    ["Meetup", "Bumble BFF"]
  ),
];
