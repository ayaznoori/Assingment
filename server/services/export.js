function escapeXml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function displayQuestion(q) {
  const stem = q.reviewerStatus === "edited" && q.editedStem ? q.editedStem : q.stem;
  const options =
    q.reviewerStatus === "edited" && q.editedOptions?.length ? q.editedOptions : q.options;
  const correct =
    q.reviewerStatus === "edited" && q.editedCorrectAnswer
      ? q.editedCorrectAnswer
      : q.correctAnswer;
  const explanation =
    q.reviewerStatus === "edited" && q.editedExplanation
      ? q.editedExplanation
      : q.explanation;
  return { stem, options, correct, explanation };
}

export function buildTaggedExport(run) {
  const approved = run.questions.filter(
    (q) => q.reviewerStatus === "approved" || q.reviewerStatus === "edited"
  );
  if (approved.length === 0) {
    throw new Error("No approved questions to export.");
  }

  const requiredSlots = [
    "theory_mcq_1",
    "theory_mcq_2",
    "true_false_1",
    "true_false_2",
    "code_analysis",
  ];
  for (const slot of requiredSlots) {
    if (!approved.find((q) => q.slot === slot)) {
      throw new Error(`Missing approved question for slot: ${slot}`);
    }
  }

  const parts = [];
  parts.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  parts.push(`<question-group id="${run._id}">`);
  parts.push(`  <metadata>`);
  parts.push(`    <source-title>${escapeXml(run.title)}</source-title>`);
  parts.push(`    <exported-at>${new Date().toISOString()}</exported-at>`);
  parts.push(`  </metadata>`);

  const order = (a, b) => a.slot.localeCompare(b.slot);
  for (const q of [...approved].sort(order)) {
    const { stem, options, correct, explanation } = displayQuestion(q);
    const tag =
      q.type === "theory_mcq"
        ? "theory-mcq"
        : q.type === "true_false"
          ? "true-false"
          : "code-analysis";

    parts.push(`  <${tag} id="${q.slot}">`);
    parts.push(`    <stem>${escapeXml(stem)}</stem>`);
    if (q.type === "code_analysis" && q.codeSnippet) {
      parts.push(
        `    <code-snippet language="javascript"><![CDATA[${q.codeSnippet}]]></code-snippet>`
      );
    }
    parts.push(`    <options>`);
    for (const opt of options) {
      parts.push(`      <option key="${escapeXml(opt.key)}">${escapeXml(opt.text)}</option>`);
    }
    parts.push(`    </options>`);
    parts.push(`    <correct-answer>${escapeXml(correct)}</correct-answer>`);
    parts.push(`    <explanation>${escapeXml(explanation)}</explanation>`);
    parts.push(`    <supporting-quote>${escapeXml(q.supportingQuote)}</supporting-quote>`);
    parts.push(`    <section>${escapeXml(q.sectionTitle)}</section>`);
    parts.push(`  </${tag}>`);
  }

  parts.push(`</question-group>`);
  return parts.join("\n");
}
