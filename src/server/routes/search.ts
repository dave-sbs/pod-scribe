import { Hono } from "hono";
import { searchCorpus } from "@/retrieval/search";
import type { SearchFilters } from "@/core/types";

const searchRoutes = new Hono();

searchRoutes.post("/", async (c) => {
  const body = await c.req.json<{
    query: string;
    topK?: number;
    filters?: SearchFilters;
  }>();
  if (!body.query) return c.json({ error: "query is required" }, 400);

  try {
    const results = await searchCorpus({
      query: body.query,
      topK: body.topK,
      filters: body.filters,
    });
    return c.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed";
    console.error("[Search Error]", message);
    return c.json({ error: message }, 503);
  }
});

export { searchRoutes };
