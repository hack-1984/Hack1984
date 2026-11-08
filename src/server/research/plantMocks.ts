// Fixture events for POST /api/tree/stream under MOCK_AI=1, so the planting scene can be
// built and tested without a network or a key. Shaped like a real run: queries first, then
// sources landing in bursts per query, then the long "grow" phase. Domains are real sites a
// search would plausibly return; titles are built from the pitch so the scene reads as the
// founder's idea, not someone else's.
import type { Mode } from "@/lib/types";
import type { PlantEvent } from "@/ideas/planting";
import { QUERY_KEYS } from "./modes";

/** One timed event: `at` ms after the stream opens. */
export interface TimedEvent {
  at: number;
  event: PlantEvent;
}

const STOP = new Set(["a", "an", "the", "that", "this", "you", "your", "for", "and", "with", "app", "tells", "where", "are", "is", "to", "of", "it", "in", "on"]);

/** Two or three meaningful words from the pitch, for titles and queries. */
function topic(pitch: string): string {
  const head = pitch.split(/[.:!?]/)[0];
  const words = head
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  return (words.slice(0, 3).join(" ") || "this idea").trim();
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function mockPlantEvents(pitch: string, mode: Mode = "startup"): TimedEvent[] {
  const t = topic(pitch);
  const T = cap(t);
  const nonprofit = mode === "nonprofit";

  const queries: Record<(typeof QUERY_KEYS)[number], string> = nonprofit
    ? {
        competitors: `${t} nonprofit organizations`,
        pricing: `${t} program funding grants 2026`,
        complaints: `${t} community needs unmet`,
        marketSize: `${t} people affected statistics`,
        news: `${t} nonprofit news 2026`,
      }
    : {
        competitors: `${t} competitors`,
        pricing: `${t} app pricing subscription`,
        complaints: `${t} app reviews complaints reddit`,
        marketSize: `${t} market size 2026`,
        news: `${t} startup funding 2026`,
      };

  const sources: Record<(typeof QUERY_KEYS)[number], { title: string; url: string }[]> = nonprofit
    ? {
        competitors: [
          { title: `${T} organizations near you`, url: "https://projects.propublica.org/nonprofits/" },
          { title: `Top-rated ${t} charities`, url: "https://www.charitynavigator.org/" },
          { title: `${T}: who else is serving this need`, url: "https://candid.org/" },
        ],
        pricing: [
          { title: `Grants for ${t} programs, 2026`, url: "https://www.grants.gov/" },
          { title: `Foundation funding trends in ${t}`, url: "https://candid.org/research" },
          { title: `${T} program budgets, Form 990 data`, url: "https://projects.propublica.org/nonprofits/" },
        ],
        complaints: [
          { title: `Why ${t} programs lose volunteers`, url: "https://www.reddit.com/r/nonprofit/" },
          { title: `Community voices on ${t}`, url: "https://nonprofitquarterly.org/" },
          { title: `${T}: what families say is still missing`, url: "https://www.npr.org/" },
        ],
        marketSize: [
          { title: `How many people need ${t}`, url: "https://www.census.gov/" },
          { title: `${T} by the numbers, 2026`, url: "https://www.pewresearch.org/" },
          { title: `Unmet need for ${t} in US cities`, url: "https://www.urban.org/" },
        ],
        news: [
          { title: `New funding announced for ${t}`, url: "https://www.philanthropy.com/" },
          { title: `${T} nonprofits in 2026: what changed`, url: "https://ssir.org/" },
          { title: `Policy shift affects ${t} programs`, url: "https://www.nytimes.com/" },
        ],
      }
    : {
        competitors: [
          { title: `Top ${t} apps compared, 2026`, url: "https://www.g2.com/" },
          { title: `${T} startups on Crunchbase`, url: "https://www.crunchbase.com/" },
          { title: `Best ${t} tools, ranked`, url: "https://www.producthunt.com/" },
        ],
        pricing: [
          { title: `What ${t} apps charge per month`, url: "https://www.capterra.com/" },
          { title: `${T} pricing: free vs premium tiers`, url: "https://www.trustpilot.com/" },
          { title: `${T} subscription benchmarks`, url: "https://www.statista.com/" },
        ],
        complaints: [
          { title: `Anyone else frustrated with ${t} apps?`, url: "https://www.reddit.com/" },
          { title: `${T} app reviews: the good and the bad`, url: "https://apps.apple.com/" },
          { title: `Why I stopped paying for ${t}`, url: "https://medium.com/" },
        ],
        marketSize: [
          { title: `${T} market size and forecast to 2030`, url: "https://www.grandviewresearch.com/" },
          { title: `${T} industry statistics, 2026`, url: "https://www.statista.com/" },
          { title: `How big is the ${t} market really?`, url: "https://www.ibisworld.com/" },
        ],
        news: [
          { title: `${T} startup raises seed round`, url: "https://techcrunch.com/" },
          { title: `${T} in 2026: what founders are building`, url: "https://news.ycombinator.com/" },
          { title: `Big tech eyes the ${t} space`, url: "https://www.theverge.com/" },
        ],
      };

  const out: TimedEvent[] = [];
  let at = 0;
  const push = (event: PlantEvent, delay: number) => {
    at += delay;
    out.push({ at, event });
  };

  push({ type: "status", phase: "queries", text: "Writing search queries" }, 200);
  QUERY_KEYS.forEach((k, i) => push({ type: "query", purpose: k, text: queries[k] }, i === 0 ? 900 : 400));
  push({ type: "status", phase: "search", text: "Searching the web" }, 500);
  // Searches resolve at different times: each query's three hits land together, queries ~700ms apart.
  QUERY_KEYS.forEach((k, i) => {
    sources[k].forEach((s, j) =>
      push({ type: "source", purpose: k, title: s.title, url: s.url, domain: new URL(s.url).hostname.replace(/^www\./, "") }, j === 0 ? (i === 0 ? 900 : 700) : 120)
    );
  });
  const n = QUERY_KEYS.length * 3;
  const sites = new Set(Object.values(sources).flat().map((s) => new URL(s.url).hostname)).size;
  push({ type: "status", phase: "read", text: `Reading ${n} sources from ${sites} sites` }, 600);
  push({ type: "status", phase: "grow", text: "Scoring your eight pillars" }, 1400);
  push({ type: "status", phase: "save", text: "Planting your idea" }, 2200);
  return out;
}
