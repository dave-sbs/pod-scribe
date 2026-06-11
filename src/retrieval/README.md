# Retrieval module

Query-time retrieval over transcript chunks.

## Contents

- `search.ts` - embeds user query, calls Supabase `hybrid_search`, and maps RPC rows into typed results.
- `context.ts` - groups and formats retrieved chunks into RAG-ready transcript context.

## Retrieval strategy

- Hybrid retrieval combines:
  - semantic similarity on embedding vectors
  - full-text keyword ranking
- Fusion uses reciprocal rank fusion (RRF) in the SQL function.
- Result count defaults to `searchTopK` from `@/core/config`.
