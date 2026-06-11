# Web module

React + Vite frontend for chat interactions.

## Contents

- `App.tsx` and `main.tsx` - application shell and bootstrap.
- `components/` - chat UI, citations, sidebar, and input components.
- `stores/` - Zustand state:
  - `conversation.ts` for persisted conversation state
  - `theme.ts` for persisted theme preference
- `lib/`
  - `api.ts` for streaming chat API calls
  - `citations.ts` for inline citation parsing and source matching
- `styles/globals.css` - shared frontend styles.

## Runtime behavior

- In development, Vite proxies `/api` requests to `http://localhost:3000`.
- Chat streaming consumes server-sent events and incrementally renders assistant output.
