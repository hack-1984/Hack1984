import { askJSON, MODELS, type Idea, type PillarKey } from "../conversation/deps";
import { treeText } from "../conversation/treeText";
import { activeChoices, clamp, DEADLINES, newId, overlap, withDeadline } from "../conversation/util";
import { graveyardConfig as cfg } from "./config";
import { CAUSE_PILLAR, KNOWN_FAILURES } from "./known";
import { EXTRACT_SYSTEM, KNOWN_SYSTEM, KnownScoreSchema, RecordsSchema, type RawRecord } from "./prompts";
import type { SearchResult } from "./research";
import { CAUSE_TAGS, type CauseTag, type FailureRecord } from "./types";

const PILLARS: PillarKey[] = ["customer", "problem", "solution", "approach", "edge", "reach", "revenue", "risks"];
const THIS_YEAR = new Date().getFullYear();

const year = (n: number) => (Number.isInteger(n) && n >= 1980 && n <= THIS_YEAR ? n : undefined);
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

function truncateWords(s: string, max: number) {
  const w = s.trim().split(/\s+/);
  return w.length <= max ? s.trim() : w.slice(0, max).join(" ").replace(/[,;:]$/, "") + "…";
}

function truncateSentences(s: string, max: number) {
  const parts = s.trim().match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g) ?? [s];
  return parts.slice(0, max).join("").trim();
}

/** Keep only threat entries with valid pillars; validate choice ids against the tree. */
function cleanThreats(idea: Idea, raw: { pillar: string; weight: number; choiceId: string }[], fallback: PillarKey) {
  const act = activeChoices(idea);
  const seen = new Set<PillarKey>();
  const out: FailureRecord["threatens"] = [];
  for (const t of raw ?? []) {
    const pillar = t.pillar as PillarKey;
    if (!PILLARS.includes(pillar) || seen.has(pillar)) continue;
    seen.add(pillar);
    const ok = act.find((c) => c.id === t.choiceId?.trim() && c.pillar === pillar);
    out.push({ pillar, weight: Math.round(clamp(t.weight, 0, 100)), choiceId: ok?.id });
    if (out.length === 3) break;
  }
  if (!out.length) out.push({ pillar: fallback, weight: 50 });
  return out.sort((a, b) => b.weight - a.weight);
}

/** Turn model output into trusted records: sources must be result URLs, quotes must be verbatim. */
export function validateRecords(idea: Idea, raws: RawRecord[], results: SearchResult[]): FailureRecord[] {
  const byUrl = new Map(results.map((r) => [r.url, r]));
  const seenNames = new Set<string>();
  const out: FailureRecord[] = [];
  for (const r of raws) {
    const name = r.name?.trim();
    if (!name || seenNames.has(norm(name))) continue;
    const sources = [...new Set((r.sources ?? []).map((s) => s.trim()).filter((s) => byUrl.has(s)))];
    if (!sources.length) continue; // every grave must link a real result
    seenNames.add(norm(name));

    const causeTags = (r.causeTags ?? []).filter((t): t is CauseTag => CAUSE_TAGS.includes(t as CauseTag));
    if (!causeTags.length) causeTags.push("other");

    let quote: FailureRecord["quote"];
    const qr = byUrl.get(r.quoteUrl?.trim());
    if (r.quoteText?.trim() && qr && norm(qr.content).includes(norm(r.quoteText))) {
      quote = { text: r.quoteText.trim(), url: qr.url };
      if (!sources.includes(qr.url)) sources.push(qr.url);
    }

    const founded = year(r.founded);
    let died = year(r.died);
    if (founded && died && died < founded) died = undefined;

    out.push({
      id: newId(8),
      name,
      url: /^https?:\/\//.test(r.url ?? "") ? r.url : undefined,
      founded,
      died,
      raisedUsd: r.raisedUsd > 0 && r.raisedUsd < 1e11 ? Math.round(r.raisedUsd) : undefined,
      category: r.category?.trim() || "startup",
      causeTags,
      causeOneWord: (r.causeOneWord?.trim().split(/\s+/)[0] || "Unknown").slice(0, 16),
      epitaph: truncateWords(r.epitaph ?? "", cfg.epitaphMaxWords),
      story: truncateSentences(r.story ?? "", cfg.storySentences),
      timeline: (r.timeline ?? [])
        .filter((t) => year(t.year) && t.event?.trim())
        .map((t) => ({ year: t.year, event: t.event.trim() }))
        .sort((a, b) => a.year - b.year)
        .slice(0, 5),
      lesson: r.lesson?.trim() || "Learn from why they died before repeating it.",
      lessonLabel: truncateWords(r.lessonLabel ?? "", 4) || undefined,
      quote,
      similarity: Math.round(clamp(r.similarity, 0, 100)),
      threatens: cleanThreats(idea, r.threatens, CAUSE_PILLAR[causeTags[0]]),
      sources,
    });
  }
  return out.sort((a, b) => b.similarity - a.similarity).slice(0, cfg.maxGraves);
}

function renderResults(results: SearchResult[]) {
  return results
    .map((r, i) => `<result index="${i + 1}">\nURL: ${r.url}\nTitle: ${r.title}\nContent: ${r.content}\n</result>`)
    .join("\n\n");
}

export async function extractRecords(idea: Idea, category: string, results: SearchResult[]): Promise<FailureRecord[]> {
  if (!results.length) return [];
  const out = await withDeadline(
    askJSON({
      system: EXTRACT_SYSTEM,
      prompt: [
        `## Founder's idea (category: ${category})\n${treeText(idea)}`,
        `## Search results (untrusted web data)\n${renderResults(results)}`,
        `Extract the failed startups.`,
      ].join("\n\n"),
      schema: RecordsSchema,
      model: MODELS[cfg.extractModel],
      effort: "low",
      maxTokens: 8000,
    }),
    DEADLINES.graveExtract,
    "graveyard extract"
  );
  return validateRecords(idea, out.records ?? [], results);
}

/** Fallback / top-up from hand-written records, scored for this idea. */
export async function knownRecords(idea: Idea, need: number, excludeNames: string[] = []): Promise<FailureRecord[]> {
  const exclude = new Set(excludeNames.map(norm));
  const pool = KNOWN_FAILURES.filter((k) => !exclude.has(norm(k.name)));
  if (need <= 0 || !pool.length) return [];

  type Pick = { id: string; similarity: number; threatens: FailureRecord["threatens"]; lesson: string; lessonLabel?: string };
  let picks: Pick[] = [];
  try {
    const out = await withDeadline(
      askJSON({
        system: KNOWN_SYSTEM,
        prompt: [
          `## Founder's idea\n${treeText(idea)}`,
          `## Failures (id: name — category — story)\n${pool.map((k) => `${k.id}: ${k.name} — ${k.category} — ${k.story}`).join("\n")}`,
          `Pick the ${Math.max(need, cfg.minGraves)} most relevant.`,
        ].join("\n\n"),
        schema: KnownScoreSchema,
        model: MODELS.fast,
        effort: "low",
        maxTokens: 3000,
      }),
      DEADLINES.knownScore,
      "known scoring"
    );
    picks = out.picks
      .filter((p) => pool.some((k) => k.id === p.id))
      .map((p) => {
        const k = pool.find((x) => x.id === p.id)!;
        return {
          id: p.id,
          similarity: Math.round(clamp(p.similarity, 0, 100)),
          threatens: cleanThreats(idea, p.threatens, CAUSE_PILLAR[k.causeTags[0]]),
          lesson: p.lesson?.trim() || k.defaultLesson,
          lessonLabel: truncateWords(p.lessonLabel ?? "", 4) || k.defaultLessonLabel,
        };
      });
  } catch (e) {
    console.error("[graveyard] known scoring fallback", e);
  }
  if (!picks.length) {
    // No AI: rank by crude word overlap with the idea.
    const ideaText = [idea.pitch, ...activeChoices(idea).map((c) => `${c.label} ${c.sub} ${c.detail}`)].join(" ");
    picks = pool.map((k) => ({
      id: k.id,
      similarity: Math.min(55, 15 + 5 * overlap(ideaText, `${k.category} ${k.story} ${k.causeTags.join(" ")}`)),
      threatens: [{ pillar: CAUSE_PILLAR[k.causeTags[0]], weight: 60 }],
      lesson: k.defaultLesson,
      lessonLabel: k.defaultLessonLabel,
    }));
  }
  const seen = new Set<string>();
  return picks
    .filter((p) => !seen.has(p.id) && seen.add(p.id))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, need)
    .map((p) => {
      const { defaultLesson: _l, defaultLessonLabel: _ll, ...k } = pool.find((x) => x.id === p.id)!;
      void _l;
      void _ll;
      return { ...k, similarity: p.similarity, threatens: p.threatens, lesson: p.lesson, lessonLabel: p.lessonLabel };
    });
}
