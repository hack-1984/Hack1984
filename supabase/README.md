# Database

Two tables, `profiles` and `ideas`, defined in `migrations/`. The Idea is stored
whole as `ideas.doc` (jsonb); see `src/lib/db/` for the TypeScript side.

## Apply

Either paste the migration into the Supabase dashboard's SQL editor and run it,
or with the CLI:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Only the public URL and publishable key go in `.env.local`. The database
password and service role key never do, and no server code needs them: the
browser talks to these tables directly under row level security.

## Rules

- Routes never touch the database. They are pure functions over an `Idea`.
- Guests (anonymous sign-in or the local stub) get no rows; their ideas stay in
  browser storage. `src/lib/db` picks the store from the session.
- `title`, `description` and `pillar_scores` are denormalised from `doc` at save time so the
  ideas list never parses the blob.
