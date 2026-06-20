import axios from "axios";
import * as cheerio from "cheerio";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Episode, TranscriptSegment } from "@/core/types";
import { ingestionConfig } from "@/ingestion/config";

const { baseUrl, podcastPath } = ingestionConfig;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(url: string): Promise<string> {
  const response = await axios.get<string>(url, {
    timeout: ingestionConfig.requestTimeoutMs,
    headers: ingestionConfig.scraperHeaders,
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
      url: `${baseUrl}${podcastPath}/${slug}`,
      date,
      category,
    },
    transcript,
    scrapedAt: new Date().toISOString(),
  };
}

async function saveEpisode(episode: Episode): Promise<string> {
  const outDir = ingestionConfig.episodesDir;
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
    const match = href.match(/\/podcasts\/${PODCAST_SLUG}\/([^/]+)/);
    if (match && !slugs.includes(match[1])) {
      slugs.push(match[1]);
    }
  });

  return slugs;
}

async function main() {
  const count = parseInt(
    process.argv[2] || String(ingestionConfig.defaultBatchCount),
    10,
  );

  console.log("Fetching episode list...");
  const listHtml = await fetchPage(`${baseUrl}${podcastPath}/`);
  const allSlugs = parseEpisodeSlugs(listHtml);
  const slugs = allSlugs.slice(0, count);

  console.log(`Found ${allSlugs.length} episodes on page 1, scraping ${slugs.length}\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < slugs.length; i++) {
    const slug = slugs[i];
    const url = `${baseUrl}${podcastPath}/${slug}`;

    console.log(`[${i + 1}/${slugs.length}] ${slug}`);

    try {
      const html = await fetchPage(url);
      const episode = parseEpisode(html, slug);
      const filePath = await saveEpisode(episode);
      console.log(
        `  ✓ "${episode.metadata.title}" — ${episode.transcript.length} segments → ${filePath}`,
      );
      success++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ Failed: ${message}`);
      failed++;
    }

    if (i < slugs.length - 1) {
      await sleep(ingestionConfig.batchDelayMs);
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
