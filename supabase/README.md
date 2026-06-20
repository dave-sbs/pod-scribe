# Supabase setup

Pod-Scribe uses a remote Supabase project (no local Supabase runtime required).

## Files

- `migrations/00001_init.sql` - base schema, pgvector extension, indexes, and `hybrid_search` function.
- `migrations/00002_rename_chunks.sql` - renames `chunks` to `founders_ep_chunks` and updates `hybrid_search`.
- `migrations/00003_generalized_corpus.sql` - generalized source, episode, entity, chunk, and research tables.
- `migrations/00004_deprecate_founders_legacy.sql` - removes the legacy Founders-only tables and `hybrid_search`.
- `schema.sql` - checked-in SQL snapshot of the current public schema for code review and reference.
- `config.toml` - optional Supabase CLI project config if you still use CLI workflows.

## Remote project requirements

- Set `SUPABASE_URL` to your project URL.
- Set `SUPABASE_SERVICE_ROLE_KEY` for server-side ingestion/search operations.

## Applying schema to remote Supabase

Choose one approach:

- Supabase Dashboard SQL Editor: run migration files in order.
- Supabase CLI against your linked remote project:
  - `bunx supabase login`
  - `bunx supabase link --project-ref <project-ref>` -- get project-ref from .env
  - `bunx supabase db push`

## Keeping `schema.sql` current

After applying migrations, refresh the schema snapshot from the linked remote project:

```sh
bun run db:schema
```

If you are running Supabase locally, you can dump the local database instead:

```sh
bun run db:schema:local
```

Commit `schema.sql` with migration changes so reviews can see the full resulting database shape in one file.
