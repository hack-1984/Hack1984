// Nonprofit test ideas: FIXTURE_NONPROFIT plus four edited copies, and a --mode flag reader.
import type { Idea } from "../src/server/conversation/deps";
import { FIXTURE_NONPROFIT } from "../src/data/fixture-nonprofit";
import { FIXTURE_IDEA } from "../src/server/conversation/fixture";

/** `--mode nonprofit` anywhere in argv; default startup. */
export const modeArg = (): "startup" | "nonprofit" =>
  process.argv.includes("--mode") && process.argv[process.argv.indexOf("--mode") + 1] === "nonprofit"
    ? "nonprofit"
    : "startup";

/** argv without the --mode flag and its value, for scripts that also take positional args. */
export const positional = () => {
  const a = process.argv.slice(2);
  const i = a.indexOf("--mode");
  if (i >= 0) a.splice(i, 2);
  return a;
};

export const fixtureForMode = (mode: "startup" | "nonprofit"): Idea => (mode === "nonprofit" ? FIXTURE_NONPROFIT : FIXTURE_IDEA);

function variant(id: string, pitch: string, labels: Record<string, [string, string]>, peers: string[]): Idea {
  return {
    ...FIXTURE_NONPROFIT,
    id,
    pitch,
    research: {
      competitors: peers.map((name) => ({ name, summary: `${name} (test peer organization)` })),
      complaints: [],
      marketNotes: [],
    },
    choices: FIXTURE_NONPROFIT.choices.map((c) =>
      labels[c.id] ? { ...c, label: labels[c.id][0], sub: labels[c.id][1], detail: labels[c.id][1] } : c
    ),
  };
}

export const NONPROFIT_PITCHES: Idea[] = [
  FIXTURE_NONPROFIT,
  variant(
    "np-food-pantry",
    "A weekend food pantry run out of a church basement for families near the rail yards.",
    {
      "cus-1": ["Working families", "near the rail yards"],
      "pro-1": ["Weekend food gaps", "school meals stop Friday"],
      "sol-1": ["Saturday pantry", "client-choice shelves"],
      "app-1": ["Volunteer shifts", "church members"],
      "rev-1": ["Food bank partnership", "donated stock"],
      "ris-1": ["Volunteer burnout", "same ten people"],
    },
    ["Feeding America"]
  ),
  variant(
    "np-river-cleanup",
    "Monthly river cleanups with paddlers that also log litter data for the city.",
    {
      "cus-1": ["Riverside neighbors", "use the trail"],
      "pro-1": ["Litter in river", "after every storm"],
      "sol-1": ["Monthly cleanups", "kayaks and shore crews"],
      "app-1": ["Paddling club volunteers", "own boats"],
      "rev-1": ["City environmental grant", "one-year"],
      "ris-1": ["Safety on water", "liability"],
    },
    ["River Network"]
  ),
  variant(
    "np-community-theater",
    "A free summer theater program where teens write and stage plays about their neighborhood.",
    {
      "cus-1": ["Teens 14 to 18", "summer break"],
      "pro-1": ["Nothing to do", "no summer jobs"],
      "sol-1": ["Six-week theater lab", "write and perform"],
      "app-1": ["Local actors teach", "paid stipends"],
      "rev-1": ["Arts council grant", "plus ticket donations"],
      "ris-1": ["Teens drop out", "need summer income"],
    },
    ["Boys & Girls Clubs of America"]
  ),
  variant(
    "np-refugee-jobs",
    "Job training and placement for newly arrived refugees in warehouse and hospitality work.",
    {
      "cus-1": ["Newly arrived refugees", "first year in US"],
      "pro-1": ["No US work history", "credentials not recognized"],
      "sol-1": ["Eight-week job track", "English plus skills"],
      "app-1": ["Employer partners", "guaranteed interviews"],
      "rev-1": ["Resettlement agency contract", "per placement"],
      "ris-1": ["Contract cuts", "federal funding swings"],
    },
    ["International Rescue Committee"]
  ),
];
