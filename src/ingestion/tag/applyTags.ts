import type { Episode } from "@/core/types";
import { setEpisodeEntities, setEpisodeTopic } from "@/db/episodes";
import { readCatalog, seedCatalog } from "./catalog";

type CatalogContext = {
  aliasToEntityId: Map<string, number>;
};

export async function buildCatalogContext(): Promise<CatalogContext> {
  const [catalog, slugToId] = await Promise.all([readCatalog(), seedCatalog()]);
  const aliasToEntityId = new Map<string, number>();

  for (const entity of catalog) {
    const id = slugToId.get(entity.slug);
    if (!id) continue;
    aliasToEntityId.set(entity.name.toLowerCase(), id);
    for (const alias of entity.aliases) {
      aliasToEntityId.set(alias.toLowerCase(), id);
    }
  }

  return { aliasToEntityId };
}

export async function applyEpisodeTags(
  episodeId: number,
  episode: Episode,
  context: CatalogContext,
): Promise<void> {
  const title = episode.metadata.title.toLowerCase();
  const transcriptSample = episode.transcript
    .slice(0, 50)
    .map((s) => s.text.toLowerCase())
    .join(" ");
  const searchable = `${title}\n${transcriptSample}`;

  const entityIds = new Set<number>();
  for (const [alias, id] of context.aliasToEntityId.entries()) {
    if (searchable.includes(alias)) {
      entityIds.add(id);
    }
  }

  const fashionSignals = [
    "fashion",
    "couture",
    "luxury",
    "designer",
    "retail",
    "style",
    "beauty",
    "watch",
    "apparel",
  ];
  const matchedSignals = fashionSignals.filter((signal) =>
    searchable.includes(signal),
  ).length;
  const topic = matchedSignals >= 2 || entityIds.size > 0 ? "fashion" : "not-fashion";

  await setEpisodeTopic(episodeId, topic);
  await setEpisodeEntities(episodeId, [...entityIds]);
}
