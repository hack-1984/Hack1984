/**
 * ProPublica Nonprofit Explorer — peer organizations with real Form 990 data.
 *
 * Free, no key, GET only. Everything it returns is DATA, exactly like a search
 * result: it never becomes instructions, and the only URLs that reach an Idea
 * are ones we construct ourselves from an EIN the API gave us.
 *
 * https://projects.propublica.org/nonprofits/api/v2/
 */

const BASE = "https://projects.propublica.org/nonprofits/api/v2";
const TIMEOUT_MS = 8_000;

/** One organization as the search endpoint returns it. */
interface RawOrg {
  ein?: number | string;
  name?: string;
  city?: string;
  state?: string;
  ntee_code?: string;
}

/** One filing as the organization endpoint returns it. */
interface RawFiling {
  totrevenue?: number;
  totfuncexpns?: number;
  tax_prd_yr?: number;
}

export interface PeerOrg {
  ein: string;
  name: string;
  city?: string;
  state?: string;
  /** Latest Form 990 figures, when the org has a filing with data. */
  revenue?: number;
  expenses?: number;
  year?: number;
  /** The Explorer page. Built from the EIN, never taken from model output. */
  url: string;
}

/** US states, for pulling a place out of a pitch. */
const STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
  missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
  "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK",
  oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI",
  wyoming: "WY",
};

/** Big-city shorthand, since pitches say "Boston", not "Massachusetts". */
const CITY_STATE: Record<string, string> = {
  boston: "MA", dorchester: "MA", cambridge: "MA", somerville: "MA",
  "new york": "NY", brooklyn: "NY", queens: "NY", bronx: "NY",
  chicago: "IL", "los angeles": "CA", "san francisco": "CA", oakland: "CA",
  seattle: "WA", portland: "OR", denver: "CO", austin: "TX", houston: "TX",
  dallas: "TX", atlanta: "GA", miami: "FL", philadelphia: "PA",
  pittsburgh: "PA", detroit: "MI", baltimore: "MD", "washington dc": "DC",
  phoenix: "AZ", "new orleans": "LA", nashville: "TN", "kansas city": "MO",
  minneapolis: "MN", cleveland: "OH", columbus: "OH", milwaukee: "WI",
  providence: "RI", hartford: "CT", newark: "NJ",
};

/** The state a pitch names, if any. Longest match wins ("new york" over "york"). */
export function stateFromPitch(pitch: string): string | undefined {
  const p = ` ${pitch.toLowerCase()} `;
  const hit = [...Object.entries(STATES), ...Object.entries(CITY_STATE)]
    .filter(([name]) => p.includes(` ${name} `) || p.includes(` ${name},`))
    .sort((a, b) => b[0].length - a[0].length)[0];
  if (hit) return hit[1];

  // A bare two-letter code, e.g. "in MA".
  const code = pitch.match(/\b([A-Z]{2})\b/);
  if (code && Object.values(STATES).includes(code[1])) return code[1];
  return undefined;
}

async function getJSON<T>(url: string): Promise<T | undefined> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { accept: "application/json" },
    });
    // The Explorer answers 404 for a search that simply matched nothing, which
    // is an ordinary outcome here, not a failure worth logging.
    if (res.status === 404) return undefined;
    if (!res.ok) {
      console.warn(`[propublica] ${res.status} for ${url}`);
      return undefined;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[propublica] ${err instanceof Error ? err.message : err}`);
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

/** EINs come back as numbers and lose their leading zero. */
function padEin(ein: number | string): string {
  return String(ein).padStart(9, "0");
}

/** Search the Explorer for public charities (c_code 3) matching `terms`. */
export async function searchNonprofits(terms: string, state?: string): Promise<PeerOrg[]> {
  const qs = new URLSearchParams({ q: terms });
  qs.set("c_code[id]", "3");
  if (state) qs.set("state[id]", state);

  const data = await getJSON<{ organizations?: RawOrg[] }>(`${BASE}/search.json?${qs}`);
  const orgs = data?.organizations ?? [];

  return orgs
    .filter((o) => o.ein && o.name)
    .map((o) => {
      const ein = padEin(o.ein!);
      return {
        ein,
        name: String(o.name),
        city: o.city ? String(o.city) : undefined,
        state: o.state ? String(o.state) : undefined,
        url: `https://projects.propublica.org/nonprofits/organizations/${ein}`,
      };
    });
}

/** The latest filing that actually carries financials. */
export async function latestFiling(ein: string): Promise<RawFiling | undefined> {
  const data = await getJSON<{ filings_with_data?: RawFiling[] }>(
    `${BASE}/organizations/${ein}.json`
  );
  const filings = (data?.filings_with_data ?? []).filter(
    (f) => typeof f.totrevenue === "number" && f.totrevenue > 0
  );
  if (filings.length === 0) return undefined;
  return filings.sort((a, b) => (b.tax_prd_yr ?? 0) - (a.tax_prd_yr ?? 0))[0];
}

/**
 * Up to `limit` peer organizations for a pitch, each with its latest Form 990
 * figures where the Explorer has them.
 *
 * Never throws: research is best-effort, and a nonprofit tree is still worth
 * drawing when the Explorer is slow or down.
 */
export async function peerOrganizations(
  terms: string,
  pitch: string,
  limit = 3
): Promise<PeerOrg[]> {
  const t0 = Date.now();
  const state = stateFromPitch(pitch);

  // The Explorer matches organization NAMES, so it behaves like an AND over
  // words: "food pantry" finds 2150, "youth tutoring program" finds none.
  // Drop trailing words until something matches, and only then widen past the
  // state filter — a local peer is worth more than a national one.
  const words = terms.trim().split(/\s+/).filter(Boolean);
  const candidates = [words, words.slice(0, 2), words.slice(0, 1)]
    .map((w) => w.join(" "))
    .filter((q, i, a) => q && a.indexOf(q) === i);

  /**
   * One candidate query, resolved to peers with their filings attached.
   *
   * A peer is only worth showing if it carries real numbers, and plenty of
   * small charities file a 990-N with no financials at all. Look at more
   * candidates than we need, then prefer the ones with a filing.
   */
  const resolve = async (q: string) => {
    let orgs = await searchNonprofits(q, state);
    const matchedInState = orgs.length > 0 && !!state;
    if (orgs.length === 0 && state) orgs = await searchNonprofits(q);
    if (orgs.length === 0) return undefined;

    const pool = orgs.slice(0, Math.max(limit * 2, 6));
    const filings = await Promise.all(pool.map((o) => latestFiling(o.ein)));
    const scored = pool.map((o, i) => ({
      ...o,
      revenue: filings[i]?.totrevenue,
      expenses: filings[i]?.totfuncexpns,
      year: filings[i]?.tax_prd_yr,
    }));
    const peers = [...scored]
      .sort((a, b) => Number(b.revenue !== undefined) - Number(a.revenue !== undefined))
      .slice(0, limit);

    return { q, peers, matchedInState, withMoney: peers.filter((p) => p.revenue !== undefined).length };
  };

  // Stop at the first query whose peers carry real money. A narrow cause can
  // match only 990-N filers ("youth coding" finds four, all blank), and a
  // broader sibling term usually reaches organizations that actually file.
  let best: Awaited<ReturnType<typeof resolve>>;
  for (const q of candidates) {
    const got = await resolve(q);
    if (!got) continue;
    if (!best || got.withMoney > best.withMoney) best = got;
    if (got.withMoney > 0) break;
  }

  if (!best) {
    console.log(`[propublica] no organizations for "${terms}"${state ? ` in ${state}` : ""}`);
    return [];
  }
  if (best.q !== terms) {
    console.log(`[propublica] "${terms}" narrowed to "${best.q}"`);
  }
  console.log(
    `[propublica] ${Date.now() - t0}ms — ${best.peers.length} peers` +
      `${best.matchedInState ? ` in ${state}` : state ? " (widened past state)" : ""}, ` +
      `${best.withMoney} with Form 990 revenue`
  );
  return best.peers;
}

/** "Revenue $1.2M, 2023 Form 990" — the phrasing the plan asks for. */
export function revenueNote(p: PeerOrg): string {
  if (p.revenue === undefined || !p.year) return "";
  const r = p.revenue;
  const money =
    r >= 1_000_000 ? `$${(r / 1_000_000).toFixed(1)}M` : `$${Math.round(r / 1000)}K`;
  return `Revenue ${money}, ${p.year} Form 990.`;
}

/** The set of URLs the Explorer vouched for, for the same filter search uses. */
export function peerUrls(peers: PeerOrg[]): Set<string> {
  return new Set(peers.map((p) => p.url));
}
