import { Hono } from "hono";
import { search } from "@/retrieval/search";

const searchRoutes = new Hono();

searchRoutes.post("/", async (c) => {
  const body = await c.req.json<{ query: string; topK?: number }>();
  if (!body.query) return c.json({ error: "query is required" }, 400);

  try {
    const results = await search(body.query);
    return c.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    console.error("[Search Error]", message);
    return c.json({ error: message }, 503);
  }
});

export { searchRoutes };
