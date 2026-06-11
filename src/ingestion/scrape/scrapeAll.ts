import axios from "axios";
import * as cheerio from "cheerio";
import { writeFile, readFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import type { Episode, TranscriptSegment } from "@/core/types";

type Progress = {
  completedSlugs: string[];
  failedSlugs: string[];
  lastUpdated: string;
};

const BASE_URL = "https://podscripts.co";
const PODCAST_PATH = "/podcasts/founders";
const DELAY_MS = 8_000;
const CIRCUIT_BREAKER_THRESHOLD = 2;
const CIRCUIT_BREAKER_COOLDOWN = 5 * 60_000;
const MAX_RETRIES = 4;
const RETRY_BACKOFF_MS = 30_000;

const OUT_DIR = join(process.cwd(), "data", "founders", "episodes");
const PROGRESS_PATH = join(process.cwd(), "data", "founders", "progress.json");
const LOG_PATH = join(process.cwd(), "data", "founders", "scrape.log");

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function timestamp(): string {
  return new Date().toISOString();
}

async function log(msg: string): Promise<void> {
  const line = `[${timestamp()}] ${msg}\n`;
  process.stdout.write(line);
  await writeFile(LOG_PATH, line, { flag: "a" });
}

async function fetchWithRetry(url: string): Promise<string> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await axios.get<string>(url, {
        timeout: 30_000,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });
      return response.data;
    } catch (err: unknown) {
      const status = axios.isAxiosError(err)
        ? err.response?.status
        : undefined;

      if ((status === 429 || status === 503) && attempt < MAX_RETRIES) {
        const wait = RETRY_BACKOFF_MS * attempt;
        await log(
          `  Retry ${attempt}/${MAX_RETRIES} after ${status}, waiting ${wait / 1000}s...`,
        );
        await sleep(wait);
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}

function parseEpisode(html: string, slug: string): Episode {
  const $ = cheerio.load(html);

  const fullTitle = $("h1").first().text().trim();
  const rawDate = $(".episode_date").first().text().trim();
  const date = rawDate.replace(/^Episode Date:\s*/i, "");
  const category = $(".list-single-header-cat a").first().text().trim();

  const titleMatch = fullTitle.match(/#(\d+)\s+(.*)/);
  const episodeNumber = titleMatch ? parseInt(titleMatch[1], 10) : null;
  const title = titleMatch ? titleMatch[2].trim() : fullTitle;

  const transcript: TranscriptSegment[] = [];

  $(".single-sentence").each((_i, el) => {
    const $el = $(el);
    if ($el.find(".waldo-display-unit").length > 0) return;

    const rawTimestamp = $el.find(".pod_timestamp_indicator").text().trim();
    const ts = rawTimestamp.replace(/^Starting point is\s*/i, "");
    const rawText = $el.find(".pod_text").text().trim();
    const text = rawText.replace(/\s+/g, " ");

    if (text) {
      transcript.push({ timestamp: ts || "", text });
    }
  });

  return {
    metadata: {
      episodeNumber,
      title,
      slug,
      url: `${BASE_URL}${PODCAST_PATH}/${slug}`,
      date,
      category,
    },
    transcript,
    scrapedAt: new Date().toISOString(),
  };
}

function parseEpisodeSlugs(html: string): string[] {
  const $ = cheerio.load(html);
  const slugs: string[] = [];

  $(".listing-item a").each((_i, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/\/podcasts\/founders\/([^/]+)/);
    if (match && !slugs.includes(match[1])) {
      slugs.push(match[1]);
    }
  });

  return slugs;
}

function parseTotalPages(html: string): number {
  const $ = cheerio.load(html);
  let max = 1;
  $("a").each((_i, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/[?&]page=(\d+)/);
    if (match) {
      const page = parseInt(match[1], 10);
      if (page > max) max = page;
    }
  });
  return max;
}

async function saveEpisode(episode: Episode): Promise<string> {
  await mkdir(OUT_DIR, { recursive: true });
  const filePath = join(OUT_DIR, `${episode.metadata.slug}.json`);
  await writeFile(filePath, JSON.stringify(episode, null, 2));
  return filePath;
}

async function loadProgress(): Promise<Progress> {
  try {
    const data = await readFile(PROGRESS_PATH, "utf-8");
    return JSON.parse(data) as Progress;
  } catch {
    return { completedSlugs: [], failedSlugs: [], lastUpdated: "" };
  }
}

async function saveProgress(progress: Progress): Promise<void> {
  await mkdir(dirname(PROGRESS_PATH), { recursive: true });
  progress.lastUpdated = new Date().toISOString();
  await writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2));
}

async function main() {
  await mkdir(dirname(LOG_PATH), { recursive: true });
  await log("=== Scrape started ===");

  const progress = await loadProgress();
  progress.failedSlugs = [];
  const alreadyDone = new Set(progress.completedSlugs);

  await log(`Resuming with ${alreadyDone.size} already scraped`);

  await log("Fetching page 1 to detect pagination...");
  const firstPageHtml = await fetchWithRetry(`${BASE_URL}${PODCAST_PATH}/`);
  const totalPages = parseTotalPages(firstPageHtml);
  await log(`Found ${totalPages} pages`);

  const allSlugs: string[] = [];

  for (let page = 1; page <= totalPages; page++) {
    const url =
      page === 1
        ? `${BASE_URL}${PODCAST_PATH}/`
        : `${BASE_URL}${PODCAST_PATH}/?page=${page}`;

    const html = page === 1 ? firstPageHtml : await fetchWithRetry(url);
    const slugs = parseEpisodeSlugs(html);
    await log(`Listing page ${page}/${totalPages}: ${slugs.length} episodes`);
    allSlugs.push(...slugs);

    if (page < totalPages) await sleep(DELAY_MS);
  }

  const toScrape = allSlugs.filter((s) => !alreadyDone.has(s));
  await log(
    `Total: ${allSlugs.length} episodes, ${alreadyDone.size} done, ${toScrape.length} remaining`,
  );

  let success = 0;
  let failed = 0;
  let consecutive429s = 0;

  for (let i = 0; i < toScrape.length; i++) {
    const slug = toScrape[i];
    const url = `${BASE_URL}${PODCAST_PATH}/${slug}`;

    try {
      const html = await fetchWithRetry(url);
      const episode = parseEpisode(html, slug);
      await saveEpisode(episode);
      await log(
        `[${i + 1}/${toScrape.length}] OK "${episode.metadata.title}" (${episode.transcript.length} segments)`,
      );
      progress.completedSlugs.push(slug);
      success++;
      consecutive429s = 0;
    } catch (err: unknown) {
      const status = axios.isAxiosError(err)
        ? err.response?.status
        : undefined;
      const message = err instanceof Error ? err.message : String(err);

      await log(`[${i + 1}/${toScrape.length}] FAIL ${slug}: ${message}`);
      progress.failedSlugs.push(slug);
      failed++;

      if (status === 429 || status === 503) {
        consecutive429s++;
        if (consecutive429s >= CIRCUIT_BREAKER_THRESHOLD) {
          await log(
            `Circuit breaker tripped (${consecutive429s} consecutive failures). Cooling down for ${CIRCUIT_BREAKER_COOLDOWN / 60_000} minutes...`,
          );
          await sleep(CIRCUIT_BREAKER_COOLDOWN);
          consecutive429s = 0;
        }
      } else {
        consecutive429s = 0;
      }
    }

    await saveProgress(progress);

    if (i < toScrape.length - 1) await sleep(DELAY_MS);
  }

  await log(`=== Done: ${success} scraped, ${failed} failed ===`);
  if (progress.failedSlugs.length > 0) {
    await log(`Failed: ${progress.failedSlugs.join(", ")}`);
  }
}

main().catch(async (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  await log(`FATAL: ${msg}`);
  process.exit(1);
});
