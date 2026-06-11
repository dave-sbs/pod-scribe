# Core module

Shared cross-cutting code used by ingestion, retrieval, RAG, server, and web layers.

## Contents

- `config.ts` - validates required environment variables and exports runtime config values (model names, chunk parameters, search defaults).
- `embeddings.ts` - OpenRouter embeddings client (`embedText`, `embedTexts`).
- `types/` - domain type definitions split by concern:
  - `episode.ts` - transcript scrape payload types
  - `chunk.ts` - chunk and chunk-with-embedding types
  - `search.ts` - hybrid search result type
  - `conversation.ts` - conversation/message/source reference types
  - `api.ts` - request and SSE event payloads
  - `index.ts` - barrel re-export for `@/core/types`

## Import convention

- Prefer importing shared types from `@/core/types`.
- Prefer importing config from `@/core/config`.
