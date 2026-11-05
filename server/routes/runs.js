import { Router } from "express";
import { Run } from "../models/Run.js";
import { runGenerationPipeline } from "../services/pipeline.js";
import { buildTaggedExport } from "../services/export.js";

const router = Router();

router.get("/", async (_req, res) => {
  const runs = await Run.find().sort({ createdAt: -1 }).select("-sourceMarkdown").limit(20);
  res.json(runs);
});

router.get("/:id", async (req, res) => {
  const run = await Run.findById(req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found" });
  res.json(run);
});

router.post("/", async (req, res) => {
  const { markdown } = req.body;
  if (!markdown || typeof markdown !== "string" || markdown.trim().length < 50) {
    return res.status(400).json({ error: "markdown is required (min ~50 characters)" });
  }

  const run = await Run.create({
    sourceMarkdown: markdown,
    status: "processing",
    pipelineSteps: [],
    questions: [],
  });

  try {
    const result = await runGenerationPipeline({
      markdown,
    });

    run.title = result.title;
    run.pipelineSteps = result.pipelineSteps;
    run.teachableClaims = result.teachableClaims;
    run.questions = result.questions;
    run.status = result.status;
    await run.save();
    res.status(201).json(run);
  } catch (e) {
    run.status = "failed";
    run.errorMessage = e.message;
    await run.save();
    res.status(500).json({ error: e.message, runId: run._id });
  }
});

router.patch("/:id/questions/:questionId", async (req, res) => {
  const run = await Run.findById(req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found" });

  const q = run.questions.id(req.params.questionId);
  if (!q) return res.status(404).json({ error: "Question not found" });

  const {
    reviewerStatus,
    reviewerNotes,
    editedStem,
    editedOptions,
    editedCorrectAnswer,
    editedExplanation,
  } = req.body;

  if (reviewerStatus) q.reviewerStatus = reviewerStatus;
  if (reviewerNotes !== undefined) q.reviewerNotes = reviewerNotes;
  if (editedStem !== undefined) q.editedStem = editedStem;
  if (editedOptions !== undefined) q.editedOptions = editedOptions;
  if (editedCorrectAnswer !== undefined) q.editedCorrectAnswer = editedCorrectAnswer;
  if (editedExplanation !== undefined) q.editedExplanation = editedExplanation;

  if (reviewerStatus === "edited" && !q.editedStem) {
    q.editedStem = q.stem;
    q.editedOptions = q.options;
    q.editedCorrectAnswer = q.correctAnswer;
    q.editedExplanation = q.explanation;
  }

  await run.save();
  res.json(q);
});

router.post("/:id/export", async (req, res) => {
  const run = await Run.findById(req.params.id);
  if (!run) return res.status(404).json({ error: "Run not found" });

  try {
    const xml = buildTaggedExport(run);
    run.status = "exported";
    await run.save();
    res.type("application/xml").send(xml);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

export default router;
