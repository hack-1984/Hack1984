This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

# Graveyard API

Three endpoints. All POST, all stateless — send the whole `Idea` every time.
`MOCK_AI=1` returns fixture graves instantly with no network calls.

The server never mutates the idea. The client applies the updates and sets
`hauntedBy` itself.

## POST /api/graveyard

Failed startups similar to this idea. **Frozen contract — do not change this
shape.**

```ts
// request
{ idea: Idea }

// response
{ graves: Grave[], adjacent: boolean }
```

`adjacent` is `true` when nothing closely similar was found and the graves come
from neighbouring markets instead. `Grave.sources` only ever holds URLs that
appeared in real search results.

## POST /api/graveyard/detail

The same research, with everything the UI might want: timelines, cause tags,
verbatim quotes, and **the tree updates already computed**.

```ts
// request
{ idea: Idea }

// response
{ records: DetailedRecord[], adjacent: boolean }
// DetailedRecord = FailureRecord & { updates: TreeUpdate[] }
```

Each record's `updates` holds a `haunt` on the threatened choice (delta scaled
by similarity, −10 to −20) and an `add` proposing a replacement choice with
`status: "proposed"`. **If you need updates, read them here** rather than
recomputing them.

## POST /api/graveyard/learn

A thin adapter for a client holding one `Grave` that wants just its
replacement choice. Returns the same `add` update `/detail` already contains.

```ts
// request
{ idea: Idea, grave: { name: string } }

// response
{ update: TreeUpdate }
```

`400` if `grave.name` is missing, `404` if no researched record matches that
name, `409` if the record threatens no resolvable active choice.

### Example

```json
{
  "update": {
    "action": "add",
    "source": "graveyard",
    "reason": "Shipping costs destroyed the unit economics.",
    "at": 1762531200000,
    "newChoice": {
      "pillar": "revenue",
      "parentId": "rev-2",
      "label": "Shipping Eats Margin",
      "sub": "Lesson from Pets.com",
      "detail": "Shipping costs destroyed the unit economics.",
      "confidence": 45,
      "status": "proposed",
      "evidence": [
        {
          "type": "source",
          "text": "Pets.com sold goods below cost and could not cover shipping.",
          "url": "https://en.wikipedia.org/wiki/Pets.com",
          "origin": "graveyard: Pets.com",
          "tier": "researched"
        }
      ]
    }
  }
}
```

## POST /api/graveyard/stream

The same research as `/detail`, streamed so graves appear as they're found
instead of all at once. Newline-delimited JSON, one event per line:

```ts
// request
{ idea: Idea }

// response: application/x-ndjson
{ type: "status", text: string }              // what the search is doing now
{ type: "grave", record: DetailedRecord }     // same shape as /detail, updates included
{ type: "done", adjacent: boolean, count: number }
{ type: "error", message: string }            // graves already sent stay valid
```

All four graveyard routes share **one research run per idea**. A stream opened
mid-search is replayed the graves found so far, then gets the rest live, so
nothing is searched twice. Each web search is extracted the moment it returns
(four smaller calls in parallel instead of one big one), which is what lets the
first grave arrive early. `MOCK_AI=1` drips the mock graves ~400ms apart.

## POST /api/graveyard/prefetch

`{ idea }` → `202`, no body. Starts the idea's run after responding (`after()`),
so the Graveyard is usually ready when opened. `/new` calls it fire-and-forget
right after planting. A no-op with `MOCK_AI=1`. The run lives in one server's
memory, so on a multi-instance host the later request may search again.

Tuning (grave count, haunt delta range, `learnConfidence`, cache TTL) lives in
`src/server/graveyard/config.ts`.
