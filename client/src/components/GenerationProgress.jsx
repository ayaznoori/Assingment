const STEP_LABELS = {
  parse: "Reading your document",
  extract_claims: "Finding ideas from the text",
  plan_slots: "Planning five question types",
  generate_questions: "Writing questions",
  judge_questions: "Checking against the source",
};

const STEP_ORDER = [
  "parse",
  "extract_claims",
  "plan_slots",
  "generate_questions",
  "judge_questions",
];

function computeProgress(steps) {
  if (!steps?.length) return 0;
  let done = 0;
  let running = false;
  for (const id of STEP_ORDER) {
    const s = steps.find((x) => x.name === id);
    if (!s) continue;
    if (s.status === "done") done += 1;
    if (s.status === "running") running = true;
    if (s.status === "error") break;
  }
  let pct = (done / STEP_ORDER.length) * 100;
  if (running) pct += 100 / STEP_ORDER.length / 2;
  return Math.min(100, Math.round(pct));
}

export default function GenerationProgress({ steps }) {
  const ordered = STEP_ORDER.map((name) => steps?.find((s) => s.name === name) || { name, status: "pending", message: "" });
  const pct = computeProgress(steps);
  const current = ordered.find((s) => s.status === "running");
  const failed = ordered.find((s) => s.status === "error");

  return (
    <div className="gen-progress" role="status" aria-live="polite">
      <div className="gen-progress__head">
        <span className="gen-progress__title">Working in the background</span>
        <span className="gen-progress__pct">{pct}%</span>
      </div>
      <div className="gen-progress__bar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="gen-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      {current && <p className="gen-progress__current">{STEP_LABELS[current.name] || current.name}…</p>}
      <ul className="gen-progress__steps">
        {ordered.map((s) => (
          <li key={s.name} className={`gen-step gen-step--${s.status}`}>
            <span className="gen-step__icon" aria-hidden>
              {s.status === "done" && "✓"}
              {s.status === "running" && <span className="spinner spinner--sm" />}
              {s.status === "error" && "!"}
              {s.status === "pending" && "○"}
            </span>
            <span className="gen-step__text">
              <strong>{STEP_LABELS[s.name] || s.name}</strong>
              {s.message && <em>{s.message}</em>}
            </span>
          </li>
        ))}
      </ul>
      {failed && (
        <p className="gen-progress__fail">Stopped at: {STEP_LABELS[failed.name] || failed.name}</p>
      )}
    </div>
  );
}
