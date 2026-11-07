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

## The LLM is Gemini, not Claude

The setup doc and build plans say Anthropic. **They're out of date** — we ran out
of Anthropic access and switched. Use `@google/genai`, never `@anthropic-ai/sdk`
(still in `package.json`, unused — don't import it).

```ts
import { askJSON, search, MODELS } from "@/lib/ai";
```

`MODELS` is in `src/lib/ai/models.ts`. **The values were chosen by probing the
key, not from docs.** Don't "fix" them to something newer without re-probing:

| What | Result |
|---|---|
| All pro models (`gemini-4-argon`, `gemini-pro-latest`, `gemini-3.1-pro-preview`) | 429 quota — **no pro tier on this key** |
| `gemini-3.8/3.7/3.6-flash`, `gemini-flash-latest` | 503 "high demand" or timeout, more often than not |
| `gemini-2.5-flash`, `gemini-2.5-pro` | 404 — retired for new users, despite being listed |
| `gemini-3.5-flash`, `gemini-3.5-flash-lite` | ✅ reliable → `MODELS.main` / `MODELS.fast` |

**503s are normal.** `askJSON` already retries transient failures with backoff.
Any new direct model call needs the same, or it will fail on stage.

`askJSON`'s signature is fixed — several people import it. Add to it, never
change it.

---

## Keys

Copy `.env.example` to `.env.local` and fill in your own. **Never commit a key
and never paste one into chat** (including to Claude — it ends up in the
transcript). `.gitignore` covers `.env*` with an exception for `.env.example`.

```
GEMINI_API_KEY=
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
| `POST /api/tree` | intake | `{ pitch, team }` | `{ idea }` |
| `POST /api/feasibility` | Team drawer | `{ idea, team }` | `{ updates }` each with `.feasibility` |
| `POST /api/launch/scene` | Launch Day | `{ idea }` | `{ scene }` |
| `POST /api/launch/personas` | Launch Day | `{ idea, scene }` | `{ personas }` |
| `POST /api/launch/run` | Launch Day | `{ idea, scene, personas, price }` | `{ results, summary, updates }` |

All five are mocked behind `MOCK_AI=1` and return 501 without it. Shapes are in
`src/lib/contracts.ts` — they're what the frontend is written against, so
changing one breaks someone else's screen.

`GET /api/health` is a temporary diagnostic that checks both API keys. Delete it
before the demo.

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
