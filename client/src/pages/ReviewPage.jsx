import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { exportRun, getRun, updateQuestion } from "../api/client.js";
import PipelineSteps from "../components/PipelineSteps.jsx";

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
        <mark>{source.slice(idx2, idx2 + short.length)}</mark>
        {source.slice(idx2 + short.length)}
      </>
    );
  }
  return (
    <>
      {source.slice(0, idx)}
      <mark>{source.slice(idx, idx + quote.trim().length)}</mark>
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

  const load = useCallback(async () => {
    const data = await getRun(runId);
    setRun(data);
    if (!selectedId && data.questions?.[0]) {
      setSelectedId(data.questions[0]._id);
    }
  }, [runId, selectedId]);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const selected = useMemo(
    () => run?.questions?.find((q) => q._id === selectedId),
    [run, selectedId]
  );

  async function patchQuestion(payload) {
    setSaving(true);
    setError("");
    try {
      await updateQuestion(runId, selectedId, payload);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    setError("");
    try {
      const xml = await exportRun(runId);
      setExportXml(xml);
    } catch (e) {
      setError(e.message);
    }
  }

  if (!run) {
    return (
      <div className="layout">
        <p>{error || "Loading run…"}</p>
      </div>
    );
  }

  const approvedCount = run.questions.filter(
    (q) => q.reviewerStatus === "approved" || q.reviewerStatus === "edited"
  ).length;

  return (
    <div className="layout">
      <header className="header">
        <div>
          <Link to="/" className="back">
            ← New run
          </Link>
          <h1>{run.title}</h1>
          <p className="muted">
            Status: {run.status} · Approved {approvedCount}/5
          </p>
        </div>
        <button type="button" onClick={handleExport} disabled={approvedCount < 5}>
          Export tagged XML
        </button>
      </header>

      {run.pipelineSteps?.length > 0 && (
        <section className="card compact">
          <PipelineSteps steps={run.pipelineSteps} />
        </section>
      )}

      {error && <p className="error">{error}</p>}

      <div className="review-grid">
        <section className="card source-pane">
          <h2>Source material</h2>
          {selected && (
            <p className="muted">
              Highlight: quote for <strong>{selected.slot}</strong>
            </p>
          )}
          <pre className="source-text">
            {selected
              ? highlightQuote(run.sourceMarkdown, selected.supportingQuote)
              : run.sourceMarkdown}
          </pre>
        </section>

        <section className="card questions-pane">
          <h2>Reviewer</h2>
          <div className="q-tabs">
            {run.questions.map((q) => (
              <button
                key={q._id}
                type="button"
                className={`q-tab ${selectedId === q._id ? "active" : ""} ${q.grounded ? "" : "warn"}`}
                onClick={() => setSelectedId(q._id)}
              >
                {q.slot.replace(/_/g, " ")}
              </button>
            ))}
          </div>

          {selected && (
            <QuestionEditor
              question={selected}
              saving={saving}
              onApprove={() => patchQuestion({ reviewerStatus: "approved" })}
              onReject={() => patchQuestion({ reviewerStatus: "rejected" })}
              onSaveEdits={(edits) =>
                patchQuestion({
                  reviewerStatus: "edited",
                  ...edits,
                })
              }
            />
          )}
        </section>
      </div>

      {exportXml && (
        <section className="card">
          <h2>Exported XML</h2>
          <pre className="export-xml">{exportXml}</pre>
        </section>
      )}
    </div>
  );
}

function QuestionEditor({ question, onApprove, onReject, onSaveEdits, saving }) {
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

  return (
    <div className="question-editor">
      <div className="meta-row">
        <span className="type-tag">{question.type}</span>
        {!question.grounded && <span className="badge warn">Ungrounded — fix or reject</span>}
        {question.judgeNotes && <span className="muted">{question.judgeNotes}</span>}
      </div>

      <label>
        Stem
        <textarea value={stem} onChange={(e) => setStem(e.target.value)} rows={3} />
      </label>

      {question.codeSnippet && (
        <label>
          Code snippet
          <pre className="code-block">{question.codeSnippet}</pre>
        </label>
      )}

      <div className="options-edit">
        <strong>Options</strong>
        {options.map((opt, i) => (
          <div key={opt.key} className="option-row">
            <span>{opt.key}</span>
            <input
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

      <label>
        Correct answer
        <input value={correct} onChange={(e) => setCorrect(e.target.value)} />
      </label>

      <label>
        Explanation
        <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={3} />
      </label>

      <label>
        Supporting quote (must exist in material)
        <textarea value={question.supportingQuote} readOnly rows={2} className="readonly" />
      </label>

      <div className="row">
        <button type="button" className="secondary" disabled={saving} onClick={onReject}>
          Reject
        </button>
        <button
          type="button"
          className="secondary"
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
          Save edits
        </button>
        <button type="button" disabled={saving} onClick={onApprove}>
          Approve
        </button>
      </div>
      <p className="muted">Status: {question.reviewerStatus}</p>
    </div>
  );
}
