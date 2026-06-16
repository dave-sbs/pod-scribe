# Ingestion module

Offline pipeline for collecting transcript data and loading it into the vector store.

## Flow

1. Scrape transcript pages from podscripts.co into `data/founders/episodes`.
2. Read episode JSON files.
3. Split transcripts into overlapping chunks.
4. Generate embeddings in batches.
5. Upsert episodes and chunks into Supabase.

## Contents

- `config.ts` - all ingestion/scraping knobs (which podcast, paths, batch sizes, delays, retries).
- `pipeline.ts` - orchestrates ingest-all behavior and per-episode processing.
- `chunker.ts` - converts transcript segments into overlapping chunk windows.
- `scrape/`:
  - `scrape.ts` - scrape one episode by slug
  - `scrapeBatch.ts` - scrape first N slugs from listing page 1
  - `scrapeAll.ts` - full crawl with retries, cooldown circuit breaker, and progress resume file

## Key config knobs

Ingestion/scraping settings live in `@/ingestion/config` (`ingestionConfig`):

- `podcastSlug` - which podcast to ingest (drives source path + data dirs)
- `embedBatchSize` / `embedBatchDelayMs` - embedding batch size and inter-batch delay
- `defaultBatchCount` / `batchDelayMs` - batch scrape count and delay
- `crawlDelayMs`, `maxRetries`, `retryBackoffMs` - full-crawl pacing and retries
- `circuitBreakerThreshold` / `circuitBreakerCooldownMs` - rate-limit cooldown
- `episodesDir` / `progressPath` / `logPath` - data locations

Chunking settings remain in `@/core/config`:

- `chunkSize` - transcript segments per chunk
- `chunkOverlap` - overlapping segments between adjacent chunks

## Data location

Scrapers and ingestion are aligned on project-root-relative paths (derived from
`podcastSlug` in `config.ts`):

- Episodes: `data/founders/episodes`
- Crawl progress: `data/founders/progress.json`
- Crawl log: `data/founders/scrape.log`
