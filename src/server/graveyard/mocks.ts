import { KNOWN_FAILURES } from "./known";
import type { FailureRecord } from "./types";

const pick = (id: string) => {
  const { defaultLesson, defaultLessonLabel, ...k } = KNOWN_FAILURES.find((x) => x.id === id)!;
  return { k, defaultLesson, defaultLessonLabel };
};

function rec(id: string, similarity: number, threatens: FailureRecord["threatens"]): FailureRecord {
  const { k, defaultLesson, defaultLessonLabel } = pick(id);
  return { ...k, similarity, threatens, lesson: defaultLesson, lessonLabel: defaultLessonLabel };
}

/** Three fixed records for MOCK_AI=1. Choice ids fall back by pillar for non-fixture ideas. */
export const MOCK_RECORDS: FailureRecord[] = [
  rec("known-moviepass", 64, [
    { pillar: "revenue", weight: 85, choiceId: "rev-1" },
    { pillar: "customer", weight: 40, choiceId: "cus-1" },
  ]),
  rec("known-color", 48, [
    { pillar: "edge", weight: 75, choiceId: "edg-1" },
    { pillar: "solution", weight: 45, choiceId: "sol-1" },
  ]),
  rec("known-quibi", 35, [{ pillar: "problem", weight: 60, choiceId: "pro-1" }]),
];
