# DB module

Remote Supabase integration layer shared by ingestion and query-time paths.

## Contents

- `client.ts` - initializes and exports the Supabase client.
- `episodes.ts` - upsert and lookup helpers for `founders_episodes`.
- `chunks.ts` - upsert helper for `founders_ep_chunks`.

`client.ts` is configured for server-side usage (`persistSession: false`, `autoRefreshToken: false`, `detectSessionInUrl: false`) per Supabase backend guidance.

## Schema dependencies

This module expects the schema from:

- `supabase/migrations/00001_init.sql`
- `supabase/migrations/00002_rename_chunks.sql`

Notable database artifacts:

- Tables: `founders_episodes`, `founders_ep_chunks`
- RPC: `hybrid_search(query_text, query_embedding, match_count, rrf_k)`
