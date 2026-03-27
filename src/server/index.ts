import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { errorHandler } from "./middleware/error";
import { chatRoutes } from "./routes/chat";
import { searchRoutes } from "./routes/search";
import { episodeRoutes } from "./routes/episodes";

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", errorHandler);

// API routes
app.route("/api/chat", chatRoutes);
app.route("/api/search", searchRoutes);
app.route("/api/episodes", episodeRoutes);

// Serve static SPA files in production
app.use("/*", serveStatic({ root: "./dist/web" }));
app.use("/*", serveStatic({ root: "./dist/web", path: "index.html" }));

const port = Number(process.env.PORT) || 3000;
console.log(`Server running at http://localhost:${port}`);

export default {
  port,
  fetch: app.fetch,
};
