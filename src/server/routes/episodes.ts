import { Hono } from "hono";
import { supabase } from "@/db/client";

const episodeRoutes = new Hono();

episodeRoutes.get("/", async (c) => {
  const { data, error } = await supabase
    .from("episodes")
    .select("episode_number, title, slug, url, published_date")
    .order("episode_number", { ascending: true });

  if (error) throw new Error(`Failed to fetch episodes: ${error.message}`);
  const episodes = (data ?? []).map((episode) => ({
    episode_number: episode.episode_number,
    title: episode.title,
    slug: episode.slug,
    url: episode.url,
    date: episode.published_date,
  }));
  return c.json({ episodes });
});

export { episodeRoutes };
