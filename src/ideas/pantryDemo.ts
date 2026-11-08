// DEMO CONTENT, used only for Pantry (our fixed worked example), with or without MOCK_AI.
// Copied from the design mock design/sprout-mocks/App.dc.html (the GR array). Not from the
// backend, and not real research: the UI labels it "Demo content". New seeds call the real routes.
//
// The mock's Pantry has different choice ids from the map's Pantry, so each grave targets the
// map choice in the same pillar that the mock's choice corresponds to:
//   CampusCook → Revenue  "Charge $8/month"           (mock v1 → map c12)
//   PrepPal    → Reach    "Campus ambassador program" (mock r1 → map c10)
//   DormChef   → Solution "Plan from a pantry photo"  (mock s1 "Weekly meal plans" → map c5)
//   BudgetBite → Approach "Mobile-first, iOS first"   (mock a1 "Recipe database" → map c7, the only Approach choice)
import type { PillarKey } from "@/lib/types";

export interface DemoGrave {
  name: string;
  years: string;
  epitaph: string;
  raised: string;
  pillar: PillarKey;
  /** Map choice the haunt lands on. */
  choiceId: string;
  similarity: number;
  x: number;
  y: number;
  rot: number;
  adjacent?: boolean;
  story: string;
  fix: string;
  /** The suggested choice "Learn from this" adds. `replaces` makes it a replacement. */
  learn: { label: string; replaces?: string };
}

export const PANTRY_GRAVES: DemoGrave[] = [
  {
    name: "CampusCook", years: "2018–2021", epitaph: "Students wouldn’t pay monthly", raised: "$1.1M",
    pillar: "revenue", choiceId: "c12", similarity: 85, x: 50, y: 40, rot: -3,
    story: "Sold meal plans to students for $9.99 a month. Most canceled after a few weeks, once money got tight.",
    fix: "Offer a cheaper monthly price or one yearly payment.",
    learn: { label: "$4/month or $29/year", replaces: "c12" },
  },
  {
    name: "PrepPal", years: "2016–2019", epitaph: "Couldn’t reach students", raised: "$600K",
    pillar: "reach", choiceId: "c10", similarity: 64, x: 20, y: 44, rot: 4,
    story: "Paid campus ambassadors to promote the app, but signups stopped as soon as the ambassadors did.",
    fix: "Grow through group chats and RAs instead of paid promoters.",
    learn: { label: "Partner with RAs" },
  },
  {
    name: "DormChef", years: "2019–2022", epitaph: "Plans didn’t fit dorm kitchens", raised: "$900K",
    pillar: "solution", choiceId: "c5", similarity: 58, x: 80, y: 42, rot: -5,
    story: "Weekly plans assumed a stove and an oven. Most students only had a microwave and a shared kitchen.",
    fix: "Build plans around microwaves and 15-minute meals.",
    learn: { label: "15-minute microwave plans" },
  },
  {
    name: "BudgetBite", years: "2020–2023", epitaph: "Grocery prices changed weekly", raised: "$400K",
    pillar: "approach", choiceId: "c7", similarity: 40, x: 36, y: 86, rot: 3, adjacent: true,
    story: "A grocery deals app whose recipes broke whenever store prices changed, so its savings promises fell apart.",
    fix: "Pull live grocery prices before suggesting meals.",
    learn: { label: "Live grocery prices" },
  },
];
