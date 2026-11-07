export const graveyardConfig = {
  minGraves: 3,
  maxGraves: 6,
  adjacentThreshold: 60,
  hauntDelta: { min: -20, max: -10 }, // scaled by similarity: 0 → max, 100 → min
  multiHaunt: false, // true = haunt every threatened pillar
  epitaphMaxWords: 10,
  storySentences: 3,
  searchTimeoutMs: 8000,
  // Record extraction writes a lot of JSON; the fast model keeps the whole run under ~20s.
  // Switch to "main" if quality matters more than speed (expect 20-30s).
  extractModel: "fast" as "fast" | "main",
  resultsPerQuery: 5,
  maxResultChars: 1500, // per search result passed to the model
  cacheTtlMs: 30 * 60 * 1000,
  learnConfidence: 45,
};

export type GraveyardConfig = typeof graveyardConfig;
