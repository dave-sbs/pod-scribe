# Server module

Hono-based API layer plus static SPA serving for production.

## Entrypoint

- `index.ts`
  - registers CORS and error middleware
  - mounts route modules under `/api/*`
  - serves built web assets from `dist/web`

## Routes

- `routes/chat.ts`
  - `POST /api/chat` streams SSE events: `sources`, `delta`, `done`, `error`
  - `POST /api/chat/title` generates a short conversation title
- `routes/search.ts`
  - `POST /api/search` returns hybrid retrieval matches
- `routes/episodes.ts`
  - `GET /api/episodes` returns episode metadata list

## Middleware

- `middleware/error.ts` - catches uncaught route errors and returns JSON 500 responses.
