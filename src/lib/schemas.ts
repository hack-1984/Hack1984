import { z } from "zod";

// Zod mirrors of src/lib/types.ts. Keep the two files in sync.
// Use these to validate anything coming back from Claude or Tavily.

export const PillarKeySchema = z.enum([
  "customer",
  "problem",
  "solution",
  "approach",
  "edge",
  "reach",
  "revenue",
  "risks",
]);

export const ModeSchema = z.enum(["startup", "nonprofit"]);
export const StatusSchema = z.enum(["active", "killed", "proposed"]);
export const EvidenceTierSchema = z.enum(["simulated", "researched", "real"]);
export const UpdateSourceSchema = z.enum([
  "research",
  "customer",
  "competitor",
  "investor",
  "plan",
  "launch",
  "graveyard",
]);

export const EvidenceSchema = z.object({
  type: z.enum(["source", "quote", "competitor"]),
  tier: EvidenceTierSchema,
  text: z.string(),
  url: z.string().url().optional(),
  origin: z.string(),
});

export const ChoiceSchema = z.object({
  id: z.string(),
  pillar: PillarKeySchema,
  parentId: z.string().optional(),
  label: z.string(),
  sub: z.string(),
  detail: z.string(),
  confidence: z.number().min(0).max(100),
  status: StatusSchema,
  feasibility: z.object({ ok: z.boolean(), note: z.string() }).optional(),
  evidence: z.array(EvidenceSchema),
  plan: z.object({ steps: z.array(z.string()), done: z.array(z.boolean()) }).optional(),
  hauntedBy: z.string().optional(),
});

/** What the model returns for a brand-new choice — the server assigns the id. */
export const NewChoiceSchema = ChoiceSchema.omit({ id: true });

export const TeamProfileSchema = z.object({
  roles: z.array(z.string()),
  skills: z.array(z.string()),
  tech: z.array(z.string()),
  hoursPerWeek: z.number().optional(),
  budget: z.string().optional(),
});

export const TreeUpdateSchema = z.object({
  action: z.enum(["strengthen", "weaken", "kill", "add"]),
  choiceId: z.string().optional(),
  delta: z.number().optional(),
  newChoice: NewChoiceSchema.optional(),
  reason: z.string(),
  quote: z.string().optional(),
  source: UpdateSourceSchema,
  at: z.number(),
});

export const IdeaSchema = z.object({
  id: z.string(),
  mode: ModeSchema,
  pitch: z.string(),
  choices: z.array(ChoiceSchema),
  history: z.array(TreeUpdateSchema),
});

// Launch Day simulation

export const CustomerGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  figure: z.enum(["person", "company"]),
  count: z.number(),
  color: z.string(),
});

export const SceneConfigSchema = z.object({
  center: z.object({ label: z.string(), icon: z.string() }),
  groups: z.array(CustomerGroupSchema).min(1).max(3),
  verbs: z.object({ buy: z.string(), curious: z.string(), leave: z.string() }),
});

export const SimPersonaSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  name: z.string(),
  blurb: z.string(),
  sourceUrl: z.string().url().optional(),
  budget: z.number(),
  habits: z.array(z.string()),
});

export const SimResultSchema = z.object({
  personaId: z.string(),
  decision: z.enum(["buy", "curious", "leave"]),
  reason: z.string(),
  maxPrice: z.number(),
  tellsFriend: z.boolean(),
  committee: z
    .array(z.object({ role: z.string(), verdict: z.enum(["yes", "no"]), reason: z.string() }))
    .optional(),
});

export const LaunchSummarySchema = z.object({
  price: z.number(),
  buy: z.number(),
  curious: z.number(),
  leave: z.number(),
  dropOffPrice: z.number(),
  byGroup: z.array(z.object({ groupId: z.string(), buyRate: z.number() })),
  topObjections: z.array(
    z.object({ text: z.string(), count: z.number(), pillar: PillarKeySchema })
  ),
});

// Graveyard

export const GraveSchema = z.object({
  name: z.string(),
  years: z.string(),
  epitaph: z.string(),
  raised: z.string().optional(),
  similarity: z.number().min(0).max(100),
  story: z.string(),
  threatens: PillarKeySchema,
  sources: z.array(z.string()),
});

// Response envelopes the API routes validate against.
export const TreeResponseSchema = z.object({ idea: IdeaSchema });
export const ResearchResponseSchema = z.object({ evidence: z.array(EvidenceSchema) });
export const UpdateResponseSchema = z.object({ updates: z.array(TreeUpdateSchema) });
