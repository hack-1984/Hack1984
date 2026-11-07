import type { Idea } from "@/lib/types";

/**
 * CodeCorner — the nonprofit fixture, the mirror of FIXTURE_IDEA.
 *
 * Specified by Step 0N of the master doc. Every route's mock returns this when
 * the mode is "nonprofit", so with MOCK_AI=1 the whole nonprofit loop runs with
 * no API calls. After Step 0N, nobody edits this file.
 *
 * Shape notes other people's mocks depend on:
 *  - `app-1` is the volunteer-mentor choice that /api/feasibility weakens.
 *  - Funding (`rev-1`) is a single source, so it sits below 45 and renders red.
 *    That is the rule, not an accident: rising revenue concentration predicts
 *    closure, so a one-source plan is never green.
 *  - People served covers middle schoolers and caregivers, and Approach leans
 *    on volunteers, which is where the Open House scene's three groups come
 *    from (60 / 25 / 15).
 *
 * The peer organizations below are invented, with invented EINs. Real Form 990
 * figures arrive at runtime from the ProPublica Explorer; a fixture must not
 * attach made-up revenue to a real charity.
 */
export const FIXTURE_NONPROFIT: Idea = {
  id: "fixture-nonprofit",
  mode: "nonprofit",
  pitch: "A free after-school coding club for middle schoolers in Dorchester.",
  createdAt: 1762500000000,
  research: {
    competitors: [
      {
        name: "Hub City Code Collective",
        url: "https://projects.propublica.org/nonprofits/organizations/043999001",
        summary: "After-school computer science for grades 6-8 across three Boston sites. Revenue $1.2M, 2023 Form 990.",
      },
      {
        name: "Eastside Youth Tech",
        url: "https://projects.propublica.org/nonprofits/organizations/043999002",
        summary: "Weekend robotics and coding workshops, heavily volunteer-run. Revenue $284K, 2023 Form 990.",
      },
      {
        name: "Girls Build Boston",
        url: "https://projects.propublica.org/nonprofits/organizations/043999003",
        summary: "Girls-only STEM programming, strong school partnerships. Revenue $610K, 2022 Form 990.",
      },
    ],
    complaints: [
      {
        text: "The bus stops running at 7pm so she can never stay for the late session.",
        url: "https://reddit.com/r/boston/1",
        where: "r/boston",
      },
      {
        text: "Everything good is downtown and we are not downtown.",
        url: "https://reddit.com/r/boston/2",
        where: "r/boston",
      },
      {
        text: "I work second shift. If it ends after six I cannot pick him up.",
        url: "https://reddit.com/r/boston/3",
        where: "r/boston",
      },
    ],
    marketNotes: [
      "About 61% of Dorchester middle schoolers qualify for free or reduced lunch (NCES, 2023).",
      "Massachusetts requires CORI background checks for anyone working unsupervised with minors.",
      "The Boston Youth Fund and two family foundations are the main local funders of out-of-school STEM.",
    ],
  },
  choices: [
    {
      id: "cus-1",
      pillar: "customer",
      label: "Dorchester 6-8 graders",
      sub: "Walk from school",
      detail: "Middle schoolers at two Dorchester schools who have no after-school option between dismissal and a parent getting home.",
      confidence: 78,
      status: "active",
      evidence: [
        {
          type: "source",
          text: "About 61% of Dorchester middle schoolers qualify for free or reduced lunch.",
          url: "https://nces.ed.gov/",
          origin: "research",
          tier: "researched",
        },
      ],
    },
    {
      id: "cus-2",
      pillar: "customer",
      parentId: "cus-1",
      label: "Working caregivers",
      sub: "Need the hours covered",
      detail: "Parents on shift work who need a safe place for their kid between 3pm and 6pm, and who decide whether the kid comes back.",
      confidence: 64,
      status: "active",
      evidence: [
        {
          type: "quote",
          text: "I work second shift. If it ends after six I cannot pick him up.",
          url: "https://reddit.com/r/boston/3",
          origin: "research",
          tier: "researched",
        },
      ],
    },
    {
      id: "pro-1",
      pillar: "problem",
      label: "Nothing after 3pm",
      sub: "Hours with no option",
      detail: "The gap between dismissal and a caregiver getting home is unsupervised, and the nearest program is a bus ride downtown.",
      confidence: 83,
      status: "active",
      evidence: [
        {
          type: "quote",
          text: "Everything good is downtown and we are not downtown.",
          url: "https://reddit.com/r/boston/2",
          origin: "research",
          tier: "researched",
        },
      ],
    },
    {
      id: "sol-1",
      pillar: "solution",
      label: "Weekly coding club",
      sub: "Two afternoons",
      detail: "Two sessions a week in a school library, small groups, one mentor per four kids, building something they pick themselves.",
      confidence: 69,
      status: "active",
      evidence: [],
      plan: { steps: ["Secure room", "Recruit mentors", "Run pilot term"], done: [true, false, false] },
    },
    {
      id: "sol-2",
      pillar: "solution",
      parentId: "sol-1",
      label: "Laptop lending",
      sub: "Take one home",
      detail: "Lending hardware widens who can take part, but adds insurance, repair and a replacement budget nobody has costed.",
      confidence: 34,
      status: "proposed",
      evidence: [],
    },
    {
      id: "app-1",
      pillar: "approach",
      label: "Volunteer mentors",
      sub: "Students and engineers",
      detail: "College students and local engineers run the sessions. No paid programme staff in year one beyond a part-time coordinator.",
      confidence: 58,
      status: "active",
      evidence: [
        {
          type: "source",
          text: "Massachusetts requires CORI background checks for anyone working unsupervised with minors.",
          url: "https://www.mass.gov/cori",
          origin: "research",
          tier: "researched",
        },
      ],
    },
    {
      id: "app-2",
      pillar: "approach",
      parentId: "app-1",
      label: "Fiscal sponsor",
      sub: "Skip own 501(c)(3)",
      detail: "Run under an existing charity's status for the first year instead of filing, so there is no board or annual return to staff.",
      confidence: 51,
      status: "proposed",
      evidence: [],
    },
    {
      id: "edg-1",
      pillar: "edge",
      label: "Inside the school",
      sub: "No bus needed",
      detail: "Running in the building the kids are already in removes the transport barrier that keeps them out of downtown programmes.",
      confidence: 72,
      status: "active",
      evidence: [
        {
          type: "quote",
          text: "The bus stops running at 7pm so she can never stay for the late session.",
          url: "https://reddit.com/r/boston/1",
          origin: "research",
          tier: "researched",
        },
      ],
    },
    {
      id: "rea-1",
      pillar: "reach",
      label: "School counselors",
      sub: "They know the kids",
      detail: "Counselors refer the students who most need somewhere to be, which beats flyers and reaches families who do not read email.",
      confidence: 61,
      status: "active",
      evidence: [],
    },
    {
      id: "rev-1",
      pillar: "revenue",
      label: "One family foundation",
      sub: "Single grant",
      detail: "A single two-year grant covers the coordinator and materials. Everything stops when it ends, and the funder knows it.",
      confidence: 29,
      status: "active",
      evidence: [
        {
          type: "source",
          text: "The Boston Youth Fund and two family foundations are the main local funders of out-of-school STEM.",
          url: "https://projects.propublica.org/nonprofits/",
          origin: "research",
          tier: "researched",
        },
      ],
    },
    {
      id: "rev-2",
      pillar: "revenue",
      parentId: "rev-1",
      label: "Mixed funding",
      sub: "Grants, donors, city",
      detail: "A grant, a small donor base and a city out-of-school contract, so no single source ending closes the programme.",
      confidence: 44,
      status: "proposed",
      evidence: [],
    },
    {
      id: "ris-1",
      pillar: "risks",
      label: "Volunteer churn",
      sub: "Semester turnover",
      detail: "Student mentors leave every semester and each new one needs a background check, so the programme re-staffs twice a year.",
      confidence: 74,
      status: "active",
      evidence: [],
    },
    {
      id: "ris-2",
      pillar: "risks",
      label: "One funder ends it",
      sub: "No second source",
      detail: "With a single grant behind the whole budget, a change of priorities at one foundation closes the programme.",
      confidence: 80,
      status: "active",
      evidence: [],
    },
  ],
  history: [],
};
