import { ensureSource } from "@/db/episodes";
import { supabase } from "@/db/client";

export async function copyFoundersToGeneralized(): Promise<void> {
  const sourceId = await ensureSource({
    name: "Founders",
    slug: "founders",
    kind: "podcast",
  });

  const { data: legacyEpisodes, error: episodesError } = await supabase
    .from("founders_episodes")
    .select("id, episode_number, title, slug, url, date, category");

  if (episodesError) {
    throw new Error(`copyFoundersToGeneralized:episodes: ${episodesError.message}`);
  }

  const rows = (legacyEpisodes ?? []).map((ep) => ({
    source_id: sourceId,
    legacy_episode_id: ep.id,
    episode_number: ep.episode_number,
    title: ep.title,
    slug: ep.slug,
    url: ep.url,
    published_date: ep.date,
    category: ep.category,
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("episodes")
      .upsert(rows, { onConflict: "slug" });
    if (error) {
      throw new Error(`copyFoundersToGeneralized:upsertEpisodes: ${error.message}`);
    }
  }

  const { data: generalizedEpisodes, error: generalizedEpisodesError } = await supabase
    .from("episodes")
    .select("id, slug");
  if (generalizedEpisodesError) {
    throw new Error(
      `copyFoundersToGeneralized:listGeneralizedEpisodes: ${generalizedEpisodesError.message}`,
    );
  }
  const bySlug = new Map(
    (generalizedEpisodes ?? []).map((ep) => [ep.slug as string, ep.id as number]),
  );
  const legacyEpisodeById = new Map(
    (legacyEpisodes ?? []).map((ep) => [ep.id as number, ep.slug as string]),
  );

  const { data: legacyChunks, error: chunksError } = await supabase
    .from("founders_ep_chunks")
    .select("episode_id, chunk_index, start_timestamp, end_timestamp, text, embedding");
  if (chunksError) {
    throw new Error(`copyFoundersToGeneralized:chunks: ${chunksError.message}`);
  }

  const chunkRows = (legacyChunks ?? [])
    .map((chunk) => {
      const slug = legacyEpisodeById.get(chunk.episode_id as number);
      if (!slug) return null;
      const episodeId = bySlug.get(slug);
      if (!episodeId) return null;
      return {
        episode_id: episodeId,
        chunk_index: chunk.chunk_index,
        start_timestamp: chunk.start_timestamp,
        end_timestamp: chunk.end_timestamp,
        text: chunk.text,
        embedding: chunk.embedding,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (chunkRows.length > 0) {
    const { error } = await supabase
      .from("chunks")
      .upsert(chunkRows, { onConflict: "episode_id,chunk_index" });
    if (error) {
      throw new Error(`copyFoundersToGeneralized:upsertChunks: ${error.message}`);
    }
  }

  console.log(
    `Copied ${rows.length} episodes and ${chunkRows.length} chunks into generalized tables.`,
  );
}

if (import.meta.main) {
  copyFoundersToGeneralized().catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
