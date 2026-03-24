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

// --- Fetch ---

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

// --- Parse ---

function parseEpisode(html: string, slug: string): Episode {
  const $ = cheerio.load(html);

  // Metadata
  const fullTitle = $("h1").first().text().trim();
  const rawDate = $(".episode_date").first().text().trim();
  const date = rawDate.replace(/^Episode Date:\s*/i, "");
  const category = $(".list-single-header-cat a").first().text().trim();

  // Parse episode number and short title from fullTitle
  // Format: "Founders - #414 How SpaceX Works"
  const titleMatch = fullTitle.match(/#(\d+)\s+(.*)/);
  const episodeNumber = titleMatch ? parseInt(titleMatch[1], 10) : null;
  const title = titleMatch ? titleMatch[2].trim() : fullTitle;

  // Transcript
  const transcript: TranscriptSegment[] = [];

  $(".single-sentence").each((_i, el) => {
    const $el = $(el);

    // Skip ad elements
    if ($el.find(".waldo-display-unit").length > 0) return;

    const rawTimestamp = $el.find(".pod_timestamp_indicator").text().trim();
    const timestamp = rawTimestamp.replace(/^Starting point is\s*/i, "");
    const rawText = $el.find(".pod_text").text().trim();
    // Collapse internal whitespace/newlines into single spaces
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
      url: `${BASE_URL}${PODCAST_PATH}/${slug}`,
      date,
      category,
    },
    transcript,
    scrapedAt: new Date().toISOString(),
  };
}

// --- Save ---

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

// --- Main ---

async function main() {
  const slug = process.argv[2] || "414-how-spacex-works";
  const url = `${BASE_URL}${PODCAST_PATH}/${slug}`;

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
