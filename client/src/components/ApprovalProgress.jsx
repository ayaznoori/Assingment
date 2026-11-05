const STEPS = ["MCQ 1", "MCQ 2", "T/F 1", "T/F 2", "Code"];

export default function ApprovalProgress({ questions, selectedId, onSelect }) {
  const order = [
    "theory_mcq_1",
    "theory_mcq_2",
    "true_false_1",
    "true_false_2",
    "code_analysis",
  ];

  const sorted = order
    .map((slot) => questions.find((q) => q.slot === slot))
    .filter(Boolean);

  const approved = sorted.filter(
    (q) => q.reviewerStatus === "approved" || q.reviewerStatus === "edited"
  ).length;

  return (
    <div className="progress-track">
      <div className="progress-track__meta">
        <span className="progress-track__label">Review progress</span>
        <span className="progress-track__count">
          {approved} <span className="muted">/ 5 approved</span>
        </span>
      </div>
      <div className="progress-bar" role="progressbar" aria-valuenow={approved} aria-valuemin={0} aria-valuemax={5}>
        <div className="progress-bar__fill" style={{ width: `${(approved / 5) * 100}%` }} />
      </div>
      <div className="progress-dots">
        {sorted.map((q, i) => {
          const done = q.reviewerStatus === "approved" || q.reviewerStatus === "edited";
          const rejected = q.reviewerStatus === "rejected";
          const active = q._id === selectedId;
          return (
            <button
              key={q._id}
              type="button"
              className={`progress-dot ${active ? "active" : ""} ${done ? "done" : ""} ${rejected ? "rejected" : ""} ${!q.grounded ? "warn" : ""}`}
              onClick={() => onSelect(q._id)}
              title={STEPS[i]}
            >
              <span className="progress-dot__num">{i + 1}</span>
              <span className="progress-dot__label">{STEPS[i]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
