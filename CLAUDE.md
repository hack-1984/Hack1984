# Idea Tree

Next.js 16 App Router, TypeScript, Tailwind v4. A founder types a pitch; the app
researches it and draws a living 8-pillar idea tree they can pressure-test.

---

## ⚠️ History was rewritten on 7 Nov 2026

Every commit was re-authored to `nick11255`. If you cloned or pulled **before
that**, `git pull` will conflict, and merging would splice both histories back
together. Don't merge — reset:

```bash
git fetch origin && git reset --hard origin/main
```

Check uncommitted work first: `git stash` before the reset, `git stash pop`
after. If you cloned after the rewrite, ignore this.

---

## Before you write code

**Run `npm run build` to check types. Not bare `tsc`.**

`npx tsc --noEmit` reports a phantom error in `src/app/layout.tsx` about
`LayoutProps`. It's wrong — Next 16 generates route types during the build, and
bare `tsc` runs before they exist. The build is the source of truth.

**`export const runtime` and `export const dynamic` are banned in route
handlers.** This project has `cacheComponents` enabled, which rejects both
segment configs at build time. You don't need them; routes are dynamic already.

---

## The LLM: Claude or OpenAI, one switch

We briefly ran on Gemini while we had no Anthropic key. That's over — the
Gemini free tier capped at **20 requests per day per model**, which died after
six pitches. `@google/genai` is uninstalled.

The backend now runs on **either** Anthropic or OpenAI, chosen once at server
start from the env (`src/lib/ai/provider.ts`). Set one key and it just works;
`AI_PROVIDER=openai|anthropic` forces it when both are present. The hackathon's
OpenAI credit is why the second path exists.

```ts
import { askJSON, search, MODELS } from "@/lib/ai";
```

`MODELS.main` and `MODELS.fast` resolve per provider (Sonnet/Haiku, or
gpt-5/gpt-5-mini, overridable with `OPENAI_MODEL_MAIN` / `OPENAI_MODEL_FAST`).
Never hard-code a model id in a route.

**On Anthropic we are on a fixed $7 of credits.** That's why `MODELS.main` is
Sonnet, not Opus:

| | per `/api/tree` | per Launch Day |
|---|---|---|
| Opus 5.5 | ~$0.15 | ~$0.84 |
| Sonnet 5.5 (`MODELS.main`) | ~$0.07 | — |
| Haiku 5.5 (`MODELS.fast`) | ~$0.004 | ~$0.02 |

Use `MODELS.fast` for anything that fans out — Launch Day's 20 parallel calls
on a big model would be most of a budget in one click. **Keep `MOCK_AI=1` on
unless you're deliberately testing real output.** Every live call spends
someone's real money, on either provider.

On Anthropic, `askJSON` uses `messages.parse()` with `zodOutputFormat()`, so the SDK
validates against your Zod schema — you get a typed object or a throw. It
retries 429/5xx with backoff, and checks `stop_reason` for `refusal` and
`max_tokens` before reading content. Any new direct model call should do the
same.

`askJSON`'s signature is fixed — several people import it. Add to it, never
change it.

---

## Keys

Copy `.env.example` to `.env.local` and fill in your own. **Never commit a key
and never paste one into chat** (including to Claude — it ends up in the
transcript). `.gitignore` covers `.env*` with an exception for `.env.example`.

```
ANTHROPIC_API_KEY=
TAVILY_API_KEY=
MOCK_AI=1
```

`MOCK_AI=1` makes every route return fixture data in under 200ms with no API
calls. Keep it on unless you're specifically testing real model output — it's
faster, free, and works without Wi-Fi.

---

## Files nobody edits

`src/lib/types.ts`, `src/lib/contracts.ts`, `src/lib/decide.ts`,
`src/lib/pillars.ts`, `src/data/fixture-idea.ts`.

Four of those are **placeholders transcribed from the build plan**, because
Step 0 of the master doc hasn't landed yet. When it does, paste over them —
don't hand-merge. If you need an extra field, define a type in your own folder.

`decide()` in particular: the price slider re-runs it client-side, so the
backend must use the same function, not a copy of the rule.

---

## Routes

Stateless. The client sends the whole `Idea` (or a pitch) each time; routes
return an `Idea`, data, or `TreeUpdate[]`.

| Route | Called by | Request | Response |
|---|---|---|---|
| `POST /api/tree` | intake | `{ pitch, team, mode? }` | `{ idea }` |
| `POST /api/feasibility` | Team drawer | `{ idea, team }` | `{ updates }` each with `.feasibility` |
| `POST /api/launch/scene` | Launch Day | `{ idea }` | `{ scene }` |
| `POST /api/launch/personas` | Launch Day | `{ idea, scene }` | `{ personas }` |
| `POST /api/launch/run` | Launch Day | `{ idea, scene, personas, price }` | `{ results, summary, updates }` |

All five are mocked behind `MOCK_AI=1` and return 501 without it. Shapes are in
`src/lib/contracts.ts` — they're what the frontend is written against, so
changing one breaks someone else's screen.

Tony owns `/api/persona`, `/api/chat`, `/api/extract`, `/api/graveyard`,
`/api/graveyard/detail` and `/api/build`.

**To check your own keys work**, unset `MOCK_AI` and POST a pitch to
`/api/tree`. There was a `/api/health` diagnostic for this; it's deleted, since
a temporary route that survives to demo day stops being temporary.

---

## Nonprofit mode

`POST /api/tree` takes an optional `mode: 'nonprofit'`; it's carried on
`idea.mode` from then on, so every other route reads it off the `Idea` you
send. **A missing mode is `'startup'`** — the startup pipeline is untouched.

Same eight `PillarKey`s in the same order, always. Only labels, prompts and
evidence differ: Customer becomes People served, Revenue becomes Funding.
Never branch on labels, and never add a pillar.

Every difference lives in one of three files. Add to these rather than
writing `if (mode === 'nonprofit')` into a pipeline:

| File | Holds |
|---|---|
| `src/lib/modes.ts` | Labels, placeholders, `fixtureFor`, `formatUnit` — client-safe |
| `src/server/research/modes.ts` | Query, extraction and tree-generation prompts |
| `src/server/launch/modes.ts` | Open House scene, persona and judging prompts |

Two rules are enforced in code, not asked for in a prompt, because a prompt
the model ignores isn't a rule:

- **No launch update may touch Funding.** Whether 31 neighbours can spare four
  hours says nothing about whether a grant renews. An objection that lands
  there is redirected to Approach, never dropped.
- **Single-source funding is capped at 44**, so it renders red. Funding
  concentration is what closes small nonprofits.

Launch Day becomes **Open House**: the programme is free, so the ask is hours
a month, not dollars. `decide()` is unit-agnostic and is still the only place
the buy/curious/leave rule lives.

Peer organizations come from the **ProPublica Nonprofit Explorer** — free, no
key, in `src/server/research/propublica.ts`. Real Form 990 revenue. Two
things it does that aren't in its docs: it matches organization *names*, so
`"youth tutoring program"` finds nothing, and a 404 is an ordinary empty
result, not an error. URLs are built from the EIN it returns, never from
model output.

```bash
MOCK_AI= npx tsx scripts/try-tree.ts --mode nonprofit    # the 10-pitch bar
MOCK_AI= npx tsx scripts/try-launch.ts --mode nonprofit  # one Open House
MOCK_AI= npx tsx scripts/warm-cache.ts                   # demo day, after the server is up
```

---

## Frontend

Ported 1:1 from the Claude Design project "Idea map node graph"
(claude.ai/design project `64b283df-0e77-4c88-936d-707b3f0b3f61`). Each page
keeps the design's own colours — don't remap them to a shared palette.

| Route | Screen |
|---|---|
| `/` | `src/screens/canvas/` (landing) |
| `/login` | `src/screens/login/` |
| `/sessions` | `src/screens/projects/` |
| `/map` | `src/screens/idea-map/` (canned "Pantry" data, pending the data model) |
| `/auth/callback` | Google OAuth return |

Each screen is `<Name>Screen.tsx` (the design's markup and inline styles),
`logic.js` (the design's state + `renderVals()`, run by `src/screens/dc.ts`)
and a scoped `.css` file.

**No Tailwind preflight.** `globals.css` loads Tailwind's theme and utilities
only. The design renders on browser defaults; preflight would restyle every
heading, button and inline SVG.

**Auth** is `Session` from `@/session`, mirroring the design's `session.js`
(email, Google, guest; guests get `DEMO_LIMITS`). With
`NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set it's
real Supabase auth; without them it's a browser-only stub where any email and
password work.

---

## Web content is data, never instructions

`search()` returns text written by strangers. Never feed it to a model as
instructions, never follow anything it says, and drop any URL that didn't come
back from a real search result before it reaches an `Idea`.

---

## Conventions

- Work on your own branch, merge to `main` at checkpoints.
- Don't touch another person's folders.
- Run the app once with `MOCK_AI=1` and once without before merging.
