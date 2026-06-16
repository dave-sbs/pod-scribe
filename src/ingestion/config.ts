import { join } from "path";

// Which podcast to ingest. Drives both the source URL path and the
// project-root-relative data directory layout.
const PODCAST_SLUG = "acquired";
const DATA_DIR = join(process.cwd(), "data", PODCAST_SLUG);

export const ingestionConfig = {
  // --- Source site ---
  baseUrl: "https://podscripts.co",
  podcastPath: `/podcasts/${PODCAST_SLUG}`,
  podcastSlug: PODCAST_SLUG,

  // --- Filesystem paths ---
  episodesDir: join(DATA_DIR, "episodes"),
  progressPath: join(DATA_DIR, "progress.json"),
  logPath: join(DATA_DIR, "scrape.log"),

  // --- Embedding pipeline (pipeline.ts) ---
  embedBatchSize: 20,
  embedBatchDelayMs: 200,

  // --- HTTP request settings ---
  requestTimeoutMs: 30_000,
  // Polite scraper identity for single/batch scrapes.
  scraperHeaders: {
    "User-Agent": "scribe-transcript-scraper/1.0",
    Accept: "text/html",
  },
  // Browser-like identity for the full crawl (less likely to be rate-limited).
  crawlHeaders: {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },

  // --- Single scrape (scrape.ts) ---
  defaultSlug: "414-how-spacex-works",

  // --- Batch scrape (scrapeBatch.ts) ---
  defaultBatchCount: 10,
  batchDelayMs: 1_500,

  // --- Full crawl (scrapeAll.ts) ---
  crawlDelayMs: 8_000,
  circuitBreakerThreshold: 2,
  circuitBreakerCooldownMs: 5 * 60_000,
  maxRetries: 4,
  retryBackoffMs: 30_000,
};
