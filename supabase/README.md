# Supabase setup

Pod-Scribe uses a remote Supabase project (no local Supabase runtime required).

## Files

- `migrations/00001_init.sql` - base schema, pgvector extension, indexes, and `hybrid_search` function.
- `migrations/00002_rename_chunks.sql` - renames `chunks` to `founders_ep_chunks` and updates `hybrid_search`.
- `config.toml` - optional Supabase CLI project config if you still use CLI workflows.

## Remote project requirements

- Set `SUPABASE_URL` to your project URL.
- Set `SUPABASE_SERVICE_ROLE_KEY` for server-side ingestion/search operations.

## Applying schema to remote Supabase

Choose one approach:

- Supabase Dashboard SQL Editor: run migration files in order.
- Supabase CLI against your linked remote project:
  - `bunx supabase login`
  - `supabase link --project-ref <project-ref>` -- get project-ref from .env
  - `bunx supabase db push`
