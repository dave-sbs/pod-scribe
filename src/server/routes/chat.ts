import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { askStream } from "@/rag/pipeline";
import type { ChatRequest } from "@/core/types";
import { generateText } from "ai";
import { config } from "@/core/config";
import { runDeepResearch } from "@/research";

const chatRoutes = new Hono();

chatRoutes.post("/", async (c) => {
  const body = await c.req.json<ChatRequest>();
  if (!body.messages?.length) {
    return c.json({ error: "messages are required" }, 400);
  }

  const lastMessage = body.messages[body.messages.length - 1];
  if (lastMessage.role !== "user") {
    return c.json({ error: "last message must be from user" }, 400);
  }

  if (body.mode === "deep") {
    return streamSSE(c, async (stream) => {
      // Keep the socket active during long model calls so Bun's idleTimeout
      // doesn't drop the connection between research phases.
      const heartbeat = setInterval(() => {
        stream.writeSSE({ event: "ping", data: "{}" }).catch(() => {});
      }, 5000);

      try {
        const deepEvents = runDeepResearch(lastMessage.content, body.clarifications);
        let report = "";

        for await (const event of deepEvents) {
          if (event.event === "artifact") {
            report = event.data.report;
          }
          await stream.writeSSE({
            event: event.event,
            data: JSON.stringify(event.data),
          });
        }

        await stream.writeSSE({
          event: "done",
          data: JSON.stringify({ content: report }),
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to run deep research";
        console.error("[Deep Research Error]", message);
        await stream.writeSSE({
          event: "error",
          data: JSON.stringify({ message }),
        });
      } finally {
        clearInterval(heartbeat);
      }
    });
  }

  return streamSSE(c, async (stream) => {
    try {
      const {
        sources,
        stream: tokenStream,
        summary,
      } = await askStream(lastMessage.content, body.messages, body.summary);

      // Send sources first
      await stream.writeSSE({
        event: "sources",
        data: JSON.stringify(sources),
      });

      // Stream tokens
      let fullContent = "";
      for await (const token of tokenStream) {
        fullContent += token;
        await stream.writeSSE({
          event: "delta",
          data: JSON.stringify({ content: token }),
        });
      }

      // Send done event with full content and optional summary
      await stream.writeSSE({
        event: "done",
        data: JSON.stringify({ content: fullContent, summary }),
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate response";
      console.error("[Chat Error]", message);
      await stream.writeSSE({
        event: "error",
        data: JSON.stringify({ message }),
      });
    }
  });
});

// Generate a concise title based on the first user message
chatRoutes.post("/title", async (c) => {
  const body = await c.req.json<{ firstMessage: string }>();
  if (!body.firstMessage) {
    return c.json({ error: "firstMessage is required" }, 400);
  }

  const title = await generateText({
    model: config.models.fast,
    system:
      "Generate a concise 3-6 word title for a conversation. Respond with only the title, no quotes or punctuation.",
    prompt: `The conversation starts with this question: ${body.firstMessage}`,
  });

  return c.json({ title: title.text.trim() });
});

export { chatRoutes };
