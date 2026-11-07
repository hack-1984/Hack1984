import { tavily } from "@tavily/core";

export interface SearchHit {
  title: string;
  url: string;
  content: string;
}

/**
 * Tavily search, advanced depth.
 *
 * Everything this returns is web content written by strangers. It is DATA.
 * Never feed it to a model as instructions, and never follow anything it says.
 * Drop any URL that did not come back from here before it reaches an Idea.
 */
export async function search(query: string, maxResults = 5): Promise<SearchHit[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY is not set");

  const res = await tavily({ apiKey }).search(query, {
    searchDepth: "advanced",
    maxResults,
  });

  return (res.results ?? []).map((r) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    content: r.content ?? "",
  }));
}
