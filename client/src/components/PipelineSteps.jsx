const LABELS = {
  parse: "Parse markdown",
  extract_claims: "Extract teachable claims",
  plan_slots: "Plan question slots",
  generate_questions: "Generate questions",
  judge_questions: "Judge grounding",
};

export default function PipelineSteps({ steps }) {
  return (
    <ul className="pipeline">
      {steps.map((s) => (
        <li key={s.name} className={`pipeline-item ${s.status}`}>
          <strong>{LABELS[s.name] || s.name}</strong>
          <span>{s.status}</span>
          {s.message && <em>{s.message}</em>}
        </li>
      ))}
    </ul>
  );
}
