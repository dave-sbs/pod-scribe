import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { generateText } from "ai";
import { config } from "@/core/config";
import { supabase } from "@/db/client";
import {
  setEpisodeEntities,
  setEpisodeTopic,
  upsertEntity,
} from "@/db/episodes";
import { readCatalog, seedCatalog, type CatalogEntity } from "./catalog";

const PROGRESS_PATH = join(process.cwd(), "data/entities/tag-progress.json");
const EPISODES_DIR = join(process.cwd(), "data/founders/episodes");

type ProgressFile = {
  completedSlugs: string[];
};

type TaggedEntity = {
  name: string;
  type: "brand" | "person" | "org" | "other";
  confidence: number;
};

type TagResult = {
  topic: "fashion" | "not-fashion" | "mixed";
  entities: TaggedEntity[];
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function normalizeTopic(topic: string): TagResult["topic"] {
  if (topic === "fashion" || topic === "not-fashion" || topic === "mixed") {
    return topic;
  }
  return "not-fashion";
}

async function readProgress(): Promise<ProgressFile> {
  try {
    const raw = await readFile(PROGRESS_PATH, "utf-8");
    const parsed = JSON.parse(raw) as ProgressFile;
    return { completedSlugs: parsed.completedSlugs ?? [] };
  } catch {
    return { completedSlugs: [] };
  }
}

async function writeProgress(progress: ProgressFile): Promise<void> {
  await writeFile(PROGRESS_PATH, JSON.stringify(progress, null, 2), "utf-8");
}

function findCatalogEntityId(
  candidate: TaggedEntity,
  catalog: CatalogEntity[],
  slugToId: Map<string, number>,
): number | undefined {
  const normalized = candidate.name.toLowerCase();
  const matched = catalog.find((entry) => {
    if (entry.name.toLowerCase() === normalized) return true;
    return entry.aliases.some((alias) => alias.toLowerCase() === normalized);
  });
  if (!matched) return undefined;
  return slugToId.get(matched.slug);
}

async function loadTranscriptSnippet(slug: string): Promise<string> {
  const path = join(EPISODES_DIR, `${slug}.json`);
  try {
    const raw = await readFile(path, "utf-8");
    const parsed = JSON.parse(raw) as {
      transcript?: Array<{ text: string }>;
    };
    const lines = (parsed.transcript ?? [])
      .slice(0, 30)
      .map((t) => t.text)
      .join(" ");
    return lines.slice(0, 4000);
  } catch {
    return "";
  }
}

async function classifyEpisode(
  title: string,
  transcriptSnippet: string,
): Promise<TagResult> {
  const prompt = [
    "Classify this Founders podcast episode for deep-research retrieval.",
    "Return strict JSON only in this schema:",
    '{"topic":"fashion|not-fashion|mixed","entities":[{"name":"string","type":"brand|person|org|other","confidence":0.0}]}',
    "Include only entities that are clearly central to the episode.",
    "",
    `Title: ${title}`,
    "",
    `Transcript snippet: ${transcriptSnippet || "(not available)"}`,
  ].join("\n");

  const { text } = await generateText({
    model: config.models.fast,
    system:
      "You are an information extraction engine. Output only strict JSON with no markdown.",
    prompt,
  });

  try {
    const parsed = JSON.parse(text) as TagResult;
    return {
      topic: normalizeTopic(parsed.topic),
      entities: Array.isArray(parsed.entities) ? parsed.entities : [],
    };
  } catch {
    return { topic: "not-fashion", entities: [] };
  }
}

export async function backfillEpisodeTags(): Promise<void> {
  const progress = await readProgress();
  const completed = new Set(progress.completedSlugs);
  const catalog = await readCatalog();
  const slugToId = await seedCatalog();

  const { data, error } = await supabase
    .from("episodes")
    .select("id, slug, title")
    .order("id", { ascending: true });
  if (error) throw new Error(`backfillEpisodeTags:listEpisodes: ${error.message}`);

  const episodes = (data ?? []) as Array<{
    id: number;
    slug: string;
    title: string;
  }>;

  for (const episode of episodes) {
    if (completed.has(episode.slug)) continue;

    const snippet = await loadTranscriptSnippet(episode.slug);
    const tagResult = await classifyEpisode(episode.title, snippet);

    const entityIds: number[] = [];
    for (const entity of tagResult.entities) {
      if (entity.confidence < 0.55) continue;

      const existing = findCatalogEntityId(entity, catalog, slugToId);
      if (existing) {
        entityIds.push(existing);
        continue;
      }

      if (entity.confidence >= 0.8) {
        const slug = slugify(entity.name);
        const entityId = await upsertEntity({
          name: entity.name,
          slug,
          type: entity.type,
        });
        slugToId.set(slug, entityId);
        entityIds.push(entityId);
      }
    }

    await setEpisodeTopic(episode.id, tagResult.topic);
    await setEpisodeEntities(episode.id, entityIds);

    completed.add(episode.slug);
    await writeProgress({ completedSlugs: [...completed] });
    console.log(`tagged: ${episode.slug} (${tagResult.topic})`);
  }
}

if (import.meta.main) {
  backfillEpisodeTags().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
