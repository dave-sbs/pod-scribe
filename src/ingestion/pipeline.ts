import { readdir, readFile } from "fs/promises";
import { join } from "path";
import type { Episode } from "@/core/types";
import { chunkTranscript } from "./chunker";
import { embedTexts } from "@/core/embeddings";
import { upsertEpisode, getIngestedSlugs } from "@/db/episodes";
import { upsertChunks } from "@/db/chunks";

const EPISODES_DIR = join(process.cwd(), "data/founders/episodes");
const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ingestEpisode(filePath: string): Promise<void> {
  const raw = await readFile(filePath, "utf-8");
  const episode: Episode = JSON.parse(raw);
  const { metadata, transcript } = episode;

  console.log(`  ep#${metadata.episodeNumber}: ${metadata.title}`);

  const episodeId = await upsertEpisode(metadata);
  const chunks = chunkTranscript(metadata.slug, transcript);
  console.log(`    ${chunks.length} chunks`);

  const embeddedChunks = [];
  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    const embeddings = await embedTexts(batch.map((c) => c.text));
    for (let j = 0; j < batch.length; j++) {
      embeddedChunks.push({ ...batch[j], embedding: embeddings[j] });
    }
    if (i + BATCH_SIZE < chunks.length) await sleep(BATCH_DELAY_MS);
  }

  await upsertChunks(episodeId, embeddedChunks);
}

export async function ingestAll(slugFilter?: string): Promise<void> {
  const files = (await readdir(EPISODES_DIR))
    .filter((f) => f.endsWith(".json"))
    .sort();

  const ingestedSlugs = await getIngestedSlugs();
  let count = 0;

  for (const file of files) {
    const slug = file.replace(".json", "");
    if (slugFilter && slug !== slugFilter) continue;
    if (!slugFilter && ingestedSlugs.has(slug)) {
      console.log(`  skip (done): ${slug}`);
      continue;
    }
    await ingestEpisode(join(EPISODES_DIR, file));
    count++;
  }

  console.log(`\nIngested ${count} episode(s).`);
}
