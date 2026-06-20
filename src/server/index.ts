import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { errorHandler } from "./middleware/error";
import { chatRoutes } from "./routes/chat";
import { searchRoutes } from "./routes/search";
import { episodeRoutes } from "./routes/episodes";
import { researchRoutes } from "./routes/research";

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", errorHandler);

// API routes
app.route("/api/chat", chatRoutes);
app.route("/api/search", searchRoutes);
app.route("/api/episodes", episodeRoutes);
app.route("/api/research", researchRoutes);

// Serve static SPA files in production
app.use("/*", serveStatic({ root: "./dist/web" }));
app.use("/*", serveStatic({ root: "./dist/web", path: "index.html" }));

const port = Number(process.env.PORT) || 3000;
console.log(`Server running at http://localhost:${port}`);

export default {
  port,
  // Deep research streams have long gaps between events (multi-second model
  // calls). Bun's default idleTimeout is 10s; raise it to the max (255s) and
  // pair with SSE heartbeats so long phases don't drop the connection.
  idleTimeout: 255,
  fetch: app.fetch,
};
