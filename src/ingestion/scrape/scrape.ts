import axios from "axios";
import * as cheerio from "cheerio";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { Episode, TranscriptSegment } from "@/core/types";
import { ingestionConfig } from "@/ingestion/config";

const { baseUrl, podcastPath } = ingestionConfig;

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
      transcript.push({
        timestamp: timestamp || "",
        text,
      });
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

async function main() {
  const slug = process.argv[2] || ingestionConfig.defaultSlug;
  const url = `${baseUrl}${podcastPath}/${slug}`;

  console.log(`Fetching: ${url}`);
  const html = await fetchPage(url);
  console.log(`Fetched ${html.length} bytes`);

  const episode = parseEpisode(html, slug);
  console.log(`Title: ${episode.metadata.title}`);
  console.log(`Episode #: ${episode.metadata.episodeNumber}`);
  console.log(`Date: ${episode.metadata.date}`);
  console.log(`Category: ${episode.metadata.category}`);
  console.log(`Transcript segments: ${episode.transcript.length}`);

  if (episode.transcript.length > 0) {
    console.log(`\nFirst segment: "${episode.transcript[0].text.slice(0, 100)}..."`);
  }

  const filePath = await saveEpisode(episode);
  console.log(`\nSaved to: ${filePath}`);
}

main().catch((err: unknown) => {
  if (err instanceof Error) {
    console.error(`Error: ${err.message}`);
  } else {
    console.error("Unknown error", err);
  }
  process.exit(1);
});
