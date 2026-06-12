import { Hono } from "hono";
import { nanoid } from "nanoid";
import { getRunById, persistRunStatus } from "@/research/state";
import { generateClarifyingQuestions } from "@/research/clarify";

const researchRoutes = new Hono();

researchRoutes.post("/clarify", async (c) => {
  const body = await c.req.json<{ query?: string }>();
  const query = body.query?.trim();
  if (!query) return c.json({ error: "query is required" }, 400);

  const runId = nanoid();
  const questions = await generateClarifyingQuestions(query);
  return c.json({ runId, questions });
});

researchRoutes.get("/:runId", async (c) => {
  const runId = c.req.param("runId");
  const run = await getRunById(runId);
  if (!run) return c.json({ error: "run not found" }, 404);
  return c.json({ run });
});

researchRoutes.post("/:runId/resume", async (c) => {
  const runId = c.req.param("runId");
  const body = await c.req.json<{ checkpoint?: "plan" | "synthesis"; note?: string }>();

  const run = await getRunById(runId);
  if (!run) return c.json({ error: "run not found" }, 404);

  // Current implementation auto-approves checkpoints, so resume is metadata-only.
  await persistRunStatus(runId, run.status, {
    plan: run.plan,
    synthesis: run.synthesis,
    report: run.report,
  });

  return c.json({
    ok: true,
    runId,
    checkpoint: body.checkpoint ?? null,
    note:
      body.note ??
      "Checkpoint resume acknowledged. Current deep runs auto-approve and continue.",
  });
});

export { researchRoutes };
