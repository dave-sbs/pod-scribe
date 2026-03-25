import { supabase } from "./client";
import type { EpisodeMetadata } from "../types";

export async function upsertEpisode(meta: EpisodeMetadata): Promise<number> {
  const { data, error } = await supabase
    .from("founders_episodes")
    .upsert(
      {
        episode_number: meta.episodeNumber,
        title: meta.title,
        slug: meta.slug,
        url: meta.url,
        date: meta.date,
        category: meta.category,
      },
      { onConflict: "slug" }
    )
    .select("id")
    .single();

  if (error) throw new Error(`upsertEpisode: ${error.message}`);
  return (data as { id: number }).id;
}

export async function getIngestedSlugs(): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("founders_episodes")
    .select("slug, founders_ep_chunks!inner(id)");
  if (error) throw new Error(`getIngestedSlugs: ${error.message}`);
  return new Set((data ?? []).map((r: { slug: string }) => r.slug));
}
