import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { exportRun, getRun, updateQuestion } from "../api/client.js";
import ApprovalProgress from "../components/ApprovalProgress.jsx";

const SLOT_LABELS = {
  theory_mcq_1: "MCQ 1",
  theory_mcq_2: "MCQ 2",
  true_false_1: "True / False 1",
  true_false_2: "True / False 2",
  code_analysis: "Code analysis",
};

function highlightQuote(source, quote) {
  if (!quote || !source) return source;
  const idx = source.indexOf(quote.trim());
  if (idx === -1) {
    const short = quote.trim().slice(0, 40);
    const idx2 = source.indexOf(short);
    if (idx2 === -1) return source;
    return (
      <>
        {source.slice(0, idx2)}
        <mark className="quote-highlight">{source.slice(idx2, idx2 + short.length)}</mark>
        {source.slice(idx2 + short.length)}
      </>
    );
  }
  return (
    <>
      {source.slice(0, idx)}
      <mark className="quote-highlight">{source.slice(idx, idx + quote.trim().length)}</mark>
      {source.slice(idx + quote.trim().length)}
    </>
  );
}

export default function ReviewPage({ runId }) {
  const [run, setRun] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [exportXml, setExportXml] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    const data = await getRun(runId);
    setRun(data);
    setSelectedId((prev) => prev || data.questions?.[0]?._id);
  }, [runId]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const selected = useMemo(
    () => run?.questions?.find((q) => q._id === selectedId),
    [run, selectedId]
  );

  async function patchQuestion(questionId, payload) {
    setSaving(true);
    setError("");
    try {
      await updateQuestion(runId, questionId, payload);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setError("");
    setExporting(true);
    try {
      const xml = await exportRun(runId);
      setExportXml(xml);
    } catch (e) {
      setError(e.message);
    } finally {
      setExporting(false);
    }
  }

  function downloadXml() {
    if (!exportXml) return;
    const blob = new Blob([exportXml], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `questions-${runId}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!run) {
    return (
      <div className="page page--centered">
        <div className="spinner spinner--lg" />
        <p className="muted">{error || "Loading session…"}</p>
      </div>
    );
  }

  const approvedCount = run.questions.filter(
    (q) => q.reviewerStatus === "approved" || q.reviewerStatus === "edited"
  ).length;

  return (
    <div className="page page--review">
      <header className="review-header">
        <div className="review-header__intro">
          <Link to="/" className="text-link">
            ← Back
          </Link>
          <h1 className="review-header__title">{run.title}</h1>
        </div>
        <button
          type="button"
          className="btn btn--primary btn--export"
          onClick={handleExport}
          disabled={approvedCount < 5 || exporting}
        >
          {exporting ? "Exporting…" : "Export XML"}
        </button>
      </header>

      <ApprovalProgress
        questions={run.questions}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      <div className="review-split">
        <aside className="source-panel">
          <div className="source-panel__head">
            <h2 className="panel-title">Source material</h2>
            {selected && (
              <span className="source-panel__chip">{SLOT_LABELS[selected.slot]}</span>
            )}
          </div>
          <div className="source-panel__body">
            <pre className="source-doc">
              {selected
                ? highlightQuote(run.sourceMarkdown, selected.supportingQuote)
                : run.sourceMarkdown}
            </pre>
          </div>
        </aside>

        <main className="review-panel">
          {selected && (
            <QuestionEditor
              key={selected._id}
              label={SLOT_LABELS[selected.slot]}
              question={selected}
              saving={saving}
              onApprove={() => patchQuestion(selected._id, { reviewerStatus: "approved" })}
              onReject={() => patchQuestion(selected._id, { reviewerStatus: "rejected" })}
              onSaveEdits={(edits) =>
                patchQuestion(selected._id, {
                  reviewerStatus: "edited",
                  ...edits,
                })
              }
            />
          )}
        </main>
      </div>

      {exportXml && (
        <section className="export-panel">
          <div className="export-panel__head">
            <div>
              <h2 className="panel-title">Export package</h2>
              <p className="muted">Tagged XML ready for your CMS or content pipeline.</p>
            </div>
            <button type="button" className="btn btn--secondary" onClick={downloadXml}>
              Download file
            </button>
          </div>
          <pre className="code-preview">{exportXml}</pre>
        </section>
      )}
    </div>
  );
}

function QuestionEditor({ label, question, onApprove, onReject, onSaveEdits, saving }) {
  const [stem, setStem] = useState(question.stem);
  const [explanation, setExplanation] = useState(question.explanation);
  const [correct, setCorrect] = useState(question.correctAnswer);
  const [options, setOptions] = useState(question.options || []);

  useEffect(() => {
    setStem(question.stem);
    setExplanation(question.explanation);
    setCorrect(question.correctAnswer);
    setOptions(question.options || []);
  }, [question]);

  const typeLabel =
    question.type === "theory_mcq"
      ? "Multiple choice"
      : question.type === "true_false"
        ? "True or false"
        : "Code analysis";

  return (
    <div className="question-card">
      <div className="question-card__head">
        <div>
          <span className="question-card__slot">{label}</span>
          <span className="chip chip--type">{typeLabel}</span>
        </div>
        <div className="question-card__status">
          {!question.grounded && <span className="chip chip--warn">Needs source check</span>}
          {(question.reviewerStatus === "approved" || question.reviewerStatus === "edited") && (
            <span className="chip chip--success">Approved</span>
          )}
          {question.reviewerStatus === "rejected" && <span className="chip chip--muted">Rejected</span>}
        </div>
      </div>

      <div className="field">
        <label className="field__label">Question stem</label>
        <textarea
          className="field__input field__input--tall"
          value={stem}
          onChange={(e) => setStem(e.target.value)}
          rows={3}
        />
      </div>

      {question.codeSnippet && (
        <div className="field">
          <label className="field__label">Referenced code</label>
          <pre className="code-block">{question.codeSnippet}</pre>
        </div>
      )}

      <div className="field">
        <span className="field__label">Answer choices</span>
        <div className="choice-list">
          {options.map((opt, i) => (
            <div key={opt.key} className={`choice-row ${correct === opt.key ? "choice-row--correct" : ""}`}>
              <span className="choice-row__key">{opt.key}</span>
              <input
                className="field__input"
                value={opt.text}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = { ...opt, text: e.target.value };
                  setOptions(next);
                }}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="field-grid">
        <div className="field">
          <label className="field__label">Correct answer</label>
          <input className="field__input" value={correct} onChange={(e) => setCorrect(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label className="field__label">Explanation</label>
        <textarea
          className="field__input field__input--tall"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
          rows={3}
        />
      </div>

      <div className="field">
        <label className="field__label">Supporting quote</label>
        <textarea className="field__input field__input--quote" value={question.supportingQuote} readOnly />
      </div>

      <div className="action-bar">
        <button type="button" className="btn btn--danger-ghost" disabled={saving} onClick={onReject}>
          Reject
        </button>
        <div className="action-bar__right">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={saving}
            onClick={() =>
              onSaveEdits({
                editedStem: stem,
                editedOptions: options,
                editedCorrectAnswer: correct,
                editedExplanation: explanation,
              })
            }
          >
            Save changes
          </button>
          <button type="button" className="btn btn--primary" disabled={saving} onClick={onApprove}>
            {saving ? "Saving…" : "Approve question"}
          </button>
        </div>
      </div>
    </div>
  );
}
