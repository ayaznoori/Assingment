import { Router } from "express";
import { Run } from "../models/Run.js";
import { runGenerationPipeline, PIPELINE_STEP_IDS } from "../services/pipeline.js";
import { buildTaggedExport } from "../services/export.js";

const router = Router();

function initialPipelineSteps() {
  return PIPELINE_STEP_IDS.map((name) => ({
    name,
    status: "pending",
    message: "",
  }));
}

async function processRunInBackground(runId, markdown) {
  const run = await Run.findById(runId);
  if (!run) return;

  let saveChain = Promise.resolve();
  const queueSave = () => {
    saveChain = saveChain.then(() => run.save());
    return saveChain;
  };

  try {
    const result = await runGenerationPipeline({
      markdown,
      onStep: async (steps) => {
        run.pipelineSteps = steps;
        await queueSave();
      },
    });

    await saveChain;
    run.title = result.title;
    run.pipelineSteps = result.pipelineSteps;
    run.teachableClaims = result.teachableClaims;
    run.questions = result.questions;
    run.status = result.status;
    run.errorMessage = "";
    await run.save();
  } catch (e) {
    await saveChain.catch(() => {});
    run.status = "failed";
    run.errorMessage = e.message;
    await run.save();
  }
}

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
    pipelineSteps: initialPipelineSteps(),
    questions: [],
  });

  res.status(202).json({
    _id: run._id,
    status: run.status,
    pipelineSteps: run.pipelineSteps,
  });

  processRunInBackground(run._id, markdown);
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
