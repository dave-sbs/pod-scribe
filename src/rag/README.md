# RAG module

Prompting and generation logic for transcript-grounded answers.

## Contents

- `pipeline.ts`
  - `askStream(question, history, summary?)` for streaming responses and optional conversation summarization.
  - `ask(question)` for non-streaming CLI usage.
- `prompt.ts`
  - system prompt and conversation/summarization message builders.
  - history length check used to trigger summarization.

## Notes

- Retrieval context is generated in `@/retrieval/context`.
- Sources are attached with episode metadata and timestamps for citation display.
