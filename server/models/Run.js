import mongoose from "mongoose";

const questionSchema = new mongoose.Schema(
  {
    slot: {
      type: String,
      enum: ["theory_mcq_1", "theory_mcq_2", "true_false_1", "true_false_2", "code_analysis"],
      required: true,
    },
    type: {
      type: String,
      enum: ["theory_mcq", "true_false", "code_analysis"],
      required: true,
    },
    stem: { type: String, required: true },
    options: [
      {
        key: String,
        text: String,
      },
    ],
    correctAnswer: { type: String, required: true },
    explanation: { type: String, default: "" },
    supportingQuote: { type: String, required: true },
    sectionTitle: { type: String, default: "" },
    codeSnippet: { type: String, default: "" },
    grounded: { type: Boolean, default: true },
    judgeNotes: { type: String, default: "" },
    reviewerStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "edited"],
      default: "pending",
    },
    reviewerNotes: { type: String, default: "" },
    editedStem: { type: String, default: "" },
    editedOptions: [
      {
        key: String,
        text: String,
      },
    ],
    editedCorrectAnswer: { type: String, default: "" },
    editedExplanation: { type: String, default: "" },
  },
  { _id: true }
);

const pipelineStepSchema = new mongoose.Schema(
  {
    name: String,
    status: { type: String, enum: ["pending", "running", "done", "error"], default: "pending" },
    message: { type: String, default: "" },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const runSchema = new mongoose.Schema(
  {
    title: { type: String, default: "Untitled material" },
    sourceMarkdown: { type: String, required: true },
    status: {
      type: String,
      enum: ["processing", "ready_for_review", "exported", "failed"],
      default: "processing",
    },
    pipelineSteps: [pipelineStepSchema],
    teachableClaims: [
      {
        claim: String,
        supportingQuote: String,
        sectionTitle: String,
      },
    ],
    questions: [questionSchema],
    errorMessage: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Run = mongoose.model("Run", runSchema);
