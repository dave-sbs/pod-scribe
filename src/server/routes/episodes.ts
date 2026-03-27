import { Hono } from "hono";
import { supabase } from "../../data-pipeline/db/client";

const episodeRoutes = new Hono();

episodeRoutes.get("/", async (c) => {
  const { data, error } = await supabase
    .from("founders_episodes")
    .select("episode_number, title, slug, url, date")
    .order("episode_number", { ascending: true });

  if (error) throw new Error(`Failed to fetch episodes: ${error.message}`);
  return c.json({ episodes: data });
});

export { episodeRoutes };
