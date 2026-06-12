import { supabase } from "./client";
import type { EpisodeMetadata } from "@/core/types";

const DEFAULT_SOURCE = {
  name: "Founders",
  slug: "founders",
  kind: "podcast",
};

export async function ensureSource(
  source: { name: string; slug: string; kind?: string } = DEFAULT_SOURCE,
): Promise<number> {
  const { data, error } = await supabase
    .from("sources")
    .upsert(
      {
        name: source.name,
        slug: source.slug,
        kind: source.kind ?? "podcast",
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (error) throw new Error(`ensureSource: ${error.message}`);
  return (data as { id: number }).id;
}

export async function upsertEpisode(meta: EpisodeMetadata): Promise<number> {
  const sourceId = await ensureSource();

  const { data, error } = await supabase
    .from("episodes")
    .upsert(
      {
        source_id: sourceId,
        episode_number: meta.episodeNumber,
        title: meta.title,
        slug: meta.slug,
        url: meta.url,
        published_date: meta.date,
        category: meta.category,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (error) throw new Error(`upsertEpisode: ${error.message}`);
  return (data as { id: number }).id;
}

export async function getIngestedSlugs(): Promise<Set<string>> {
  const { data, error } = await supabase.from("episodes").select("slug");
  if (error) throw new Error(`getIngestedSlugs: ${error.message}`);
  return new Set((data ?? []).map((r: { slug: string }) => r.slug));
}

export async function setEpisodeTopic(
  episodeId: number,
  topic: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("episodes")
    .update({ topic })
    .eq("id", episodeId);
  if (error) throw new Error(`setEpisodeTopic: ${error.message}`);
}

export async function upsertEntity(
  entity: { type: "brand" | "person" | "org" | "other"; name: string; slug: string },
): Promise<number> {
  const { data, error } = await supabase
    .from("entities")
    .upsert(
      {
        type: entity.type,
        canonical_name: entity.name,
        slug: entity.slug,
      },
      { onConflict: "slug" },
    )
    .select("id")
    .single();

  if (error) throw new Error(`upsertEntity: ${error.message}`);
  return (data as { id: number }).id;
}

export async function upsertEntityAlias(
  entityId: number,
  alias: string,
): Promise<void> {
  const { error } = await supabase.from("entity_aliases").upsert(
    {
      entity_id: entityId,
      alias,
    },
    { onConflict: "alias" },
  );
  if (error) throw new Error(`upsertEntityAlias: ${error.message}`);
}

export async function setEpisodeEntities(
  episodeId: number,
  entityIds: number[],
): Promise<void> {
  const uniqueIds = [...new Set(entityIds)];
  await supabase.from("episode_entities").delete().eq("episode_id", episodeId);
  if (uniqueIds.length === 0) return;

  const rows = uniqueIds.map((entityId) => ({
    episode_id: episodeId,
    entity_id: entityId,
    relevance: 0.7,
  }));
  const { error } = await supabase
    .from("episode_entities")
    .upsert(rows, { onConflict: "episode_id,entity_id" });
  if (error) throw new Error(`setEpisodeEntities: ${error.message}`);
}
