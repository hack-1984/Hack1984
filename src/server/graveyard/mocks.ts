import type { Idea } from "../conversation/deps";
import { KNOWN_FAILURES, type Known } from "./known";
import { KNOWN_NONPROFIT_FAILURES } from "./known-nonprofit";
import type { FailureRecord } from "./types";

function rec(pool: Known[], id: string, similarity: number, threatens: FailureRecord["threatens"]): FailureRecord {
  const { defaultLesson, defaultLessonLabel, ...k } = pool.find((x) => x.id === id)!;
  return { ...k, similarity, threatens, lesson: defaultLesson, lessonLabel: defaultLessonLabel };
}

/** Three fixed records for MOCK_AI=1. Choice ids fall back by pillar for non-fixture ideas. */
export const MOCK_RECORDS: FailureRecord[] = [
  rec(KNOWN_FAILURES, "known-moviepass", 64, [
    { pillar: "revenue", weight: 85, choiceId: "rev-1" },
    { pillar: "customer", weight: 40, choiceId: "cus-1" },
  ]),
  rec(KNOWN_FAILURES, "known-color", 48, [
    { pillar: "edge", weight: 75, choiceId: "edg-1" },
    { pillar: "solution", weight: 45, choiceId: "sol-1" },
  ]),
  rec(KNOWN_FAILURES, "known-quibi", 35, [{ pillar: "problem", weight: 60, choiceId: "pro-1" }]),
];

/** Three fixed nonprofit records for MOCK_AI=1, aimed at FIXTURE_NONPROFIT's ids. */
export const MOCK_RECORDS_NONPROFIT: FailureRecord[] = [
  rec(KNOWN_NONPROFIT_FAILURES, "np-hull-house", 58, [
    { pillar: "revenue", weight: 85, choiceId: "rev-1" },
    { pillar: "risks", weight: 40, choiceId: "ris-1" },
  ]),
  rec(KNOWN_NONPROFIT_FAILURES, "np-playpumps", 46, [
    { pillar: "solution", weight: 75, choiceId: "sol-1" },
    { pillar: "customer", weight: 45, choiceId: "cus-1" },
  ]),
  rec(KNOWN_NONPROFIT_FAILURES, "np-kids-company", 38, [{ pillar: "revenue", weight: 70, choiceId: "rev-1" }]),
];

export const mockRecordsFor = (idea: Pick<Idea, "mode">) =>
  idea.mode === "nonprofit" ? MOCK_RECORDS_NONPROFIT : MOCK_RECORDS;
