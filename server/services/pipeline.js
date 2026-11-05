import { parseMarkdown } from "../utils/parseMarkdown.js";
import { filterGroundedClaims, validateQuestionQuotes } from "../utils/quoteValidator.js";
import {
  extractTeachableClaims,
  generateQuestionForSlot,
  judgeQuestion,
  mockQuestions,
  useMockLlm,
} from "./llm.js";

const SLOTS = [
  { slot: "theory_mcq_1", type: "theory_mcq" },
  { slot: "theory_mcq_2", type: "theory_mcq" },
  { slot: "true_false_1", type: "true_false" },
  { slot: "true_false_2", type: "true_false" },
  { slot: "code_analysis", type: "code_analysis" },
];

function pickClaimsForSlots(claims, codeBlocks) {
  const used = new Set();
  const picked = [];

  for (const { slot, type } of SLOTS) {
    let claim = claims.find((c) => !used.has(c.claim));
    if (type === "code_analysis") {
      claim =
        claims.find(
          (c) =>
            !used.has(c.claim) &&
            (c.sectionTitle?.toLowerCase().includes("example") ||
              c.claim.toLowerCase().includes("counter"))
        ) || claim;
    }
    if (!claim && claims.length) {
      claim = claims[picked.length % claims.length];
    }
    if (claim) used.add(claim.claim);
    picked.push({ slot, type, claim, noCodeInMaterial: type === "code_analysis" && codeBlocks.length === 0 });
  }

  return picked;
}

export async function runGenerationPipeline({ markdown, onStep }) {
  const steps = [
    "parse",
    "extract_claims",
    "plan_slots",
    "generate_questions",
    "judge_questions",
  ];

  const stepState = steps.map((name) => ({ name, status: "pending", message: "" }));

  const updateStep = (name, status, message = "") => {
    const s = stepState.find((x) => x.name === name);
    if (s) {
      s.status = status;
      s.message = message;
      s.at = new Date();
    }
    onStep?.([...stepState]);
  };

  updateStep("parse", "running");
  const parsed = parseMarkdown(markdown);
  const title =
    parsed.sections.find((s) => s.title !== "Introduction")?.title ||
    parsed.sections[0]?.title ||
    "Reading material";
  updateStep(
    "parse",
    "done",
    `${parsed.sections.length} sections, ${parsed.codeBlocks.length} code blocks`
  );

  updateStep("extract_claims", "running");
  let claims = await extractTeachableClaims(parsed);
  claims = filterGroundedClaims(claims, parsed.fullText);
  if (claims.length < 3) {
    updateStep("extract_claims", "error", "Not enough grounded claims after quote validation.");
    throw new Error("Fewer than 3 grounded claims after quote validation.");
  }
  updateStep("extract_claims", "done", `${claims.length} grounded claims`);

  updateStep("plan_slots", "running");
  const plan = pickClaimsForSlots(claims, parsed.codeBlocks);
  updateStep("plan_slots", "done", "Mapped 5 question slots to claims");

  updateStep("generate_questions", "running");
  let questions = [];

  const useMock = useMockLlm();
  if (useMock) {
    questions = mockQuestions(parsed.codeBlocks);
  } else {
    for (const item of plan) {
      if (item.noCodeInMaterial) {
        questions.push({
          slot: item.slot,
          type: item.type,
          stem: "[Needs reviewer] Reading has no code block — add a snippet or reject this question.",
          options: [
            { key: "A", text: "N/A" },
            { key: "B", text: "N/A" },
          ],
          correctAnswer: "A",
          explanation: "Material contained no fenced code block.",
          supportingQuote: item.claim?.supportingQuote || parsed.fullText.slice(0, 80),
          sectionTitle: item.claim?.sectionTitle || "",
          codeSnippet: "",
          grounded: false,
        });
        continue;
      }
      const q = await generateQuestionForSlot({
        slot: item.slot,
        type: item.type,
        claim: item.claim,
        codeBlocks: parsed.codeBlocks,
        fullText: parsed.fullText,
      });
      questions.push(q);
    }
  }

  questions = validateQuestionQuotes(questions, parsed.fullText);
  updateStep("generate_questions", "done", `${questions.length} questions drafted`);

  updateStep("judge_questions", "running");
  for (const q of questions) {
    if (!q.grounded) {
      q.judgeNotes = "Failed quote substring check.";
      continue;
    }
    try {
      const verdict = await judgeQuestion({ question: q, fullText: parsed.fullText });
      q.judgeNotes = verdict.notes || "";
      if (!verdict.pass) {
        q.grounded = false;
      }
    } catch (e) {
      q.judgeNotes = `Judge skipped: ${e.message}`;
    }
  }
  updateStep("judge_questions", "done", "Review flags applied");

  return {
    title,
    sourceMarkdown: markdown,
    pipelineSteps: stepState,
    teachableClaims: claims,
    questions,
    status: "ready_for_review",
  };
}
