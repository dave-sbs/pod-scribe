import axios from "axios";
import * as cheerio from "cheerio";
import { writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// --- Types ---

type TranscriptSegment = {
  timestamp: string;
  text: string;
};

type EpisodeMetadata = {
  episodeNumber: number | null;
  title: string;
  slug: string;
  url: string;
  date: string;
  category: string;
};

type Episode = {
  metadata: EpisodeMetadata;
  transcript: TranscriptSegment[];
  scrapedAt: string;
};

// --- Config ---

const BASE_URL = "https://podscripts.co";
const PODCAST_PATH = "/podcasts/founders";
const DELAY_MS = 1500;

// --- Helpers ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string> {
  const response = await axios.get<string>(url, {
    timeout: 30_000,
    headers: {
      "User-Agent": "scribe-transcript-scraper/1.0",
      Accept: "text/html",
    },
  });
  return response.data;
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
    const timestamp = rawTimestamp.replace(/^Starting point is\s*/i, "");
    const rawText = $el.find(".pod_text").text().trim();
    const text = rawText.replace(/\s+/g, " ");

    if (text) {
      transcript.push({ timestamp: timestamp || "", text });
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

async function saveEpisode(episode: Episode): Promise<string> {
  const outDir = join(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "data",
    "founders",
    "episodes"
  );
  await mkdir(outDir, { recursive: true });

  const filePath = join(outDir, `${episode.metadata.slug}.json`);
  await writeFile(filePath, JSON.stringify(episode, null, 2));
  return filePath;
}

function parseEpisodeSlugs(html: string): string[] {
  const $ = cheerio.load(html);
  const slugs: string[] = [];

  $(".listing-item h3 a, .listing-item a").each((_i, el) => {
    const href = $(el).attr("href") || "";
    const match = href.match(/\/podcasts\/founders\/([^/]+)/);
    if (match && !slugs.includes(match[1])) {
      slugs.push(match[1]);
    }
  });

  return slugs;
}

// --- Main ---

async function main() {
  const count = parseInt(process.argv[2] || "10", 10);

  console.log(`Fetching episode list...`);
  const listHtml = await fetchPage(`${BASE_URL}${PODCAST_PATH}/`);
  const allSlugs = parseEpisodeSlugs(listHtml);
  const slugs = allSlugs.slice(0, count);

  console.log(`Found ${allSlugs.length} episodes on page 1, scraping ${slugs.length}\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const url = `${BASE_URL}${PODCAST_PATH}/${slug}`;

    console.log(`[${i + 1}/${slugs.length}] ${slug}`);

    try {
      const html = await fetchPage(url);
      const episode = parseEpisode(html, slug);
      const filePath = await saveEpisode(episode);
      console.log(`  ✓ "${episode.metadata.title}" — ${episode.transcript.length} segments → ${filePath}`);
      success++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ Failed: ${message}`);
      failed++;
    }

    // Delay between requests (skip after last)
    if (i < slugs.length - 1) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\nDone: ${success} scraped, ${failed} failed`);
}

main().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error("Unknown error", err);
  }
  process.exit(1);
});
