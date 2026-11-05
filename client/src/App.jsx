import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createRun, listRuns } from "./api/client.js";
import ReviewPage from "./pages/ReviewPage.jsx";

const SAMPLE_HINT = "Paste markdown reading material here — use ## headings and ``` code fences where needed.";

export default function App() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentRuns, setRecentRuns] = useState([]);

  useEffect(() => {
    listRuns().then(setRecentRuns).catch(() => {});
  }, []);

  if (runId) {
    return <ReviewPage runId={runId} />;
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const run = await createRun(markdown);
      navigate(`/review/${run._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadSample() {
    setError("");
    try {
      const res = await fetch("/sample-reading-material.md");
      if (!res.ok) throw new Error("Sample not found");
      setMarkdown(await res.text());
    } catch {
      setError("Paste content from sample-reading-material.md in the repo root.");
    }
  }

  const charCount = markdown.length;

  return (
    <div className="page page--home">
      <section className="hero">
        <p className="eyebrow">Reading material → assessment</p>
        <h1 className="hero__title">
          Turn lessons into <span className="hero__accent">review-ready</span> questions
        </h1>
        <p className="hero__lead">
          Generate five grounded items — two MCQs, two true/false, one code analysis — then refine and
          export for your content pipeline.
        </p>
        <ul className="hero__tags">
          <li>Source-linked quotes</li>
          <li>Human review gate</li>
          <li>XML export</li>
        </ul>
      </section>

      <section className={`editor-panel ${loading ? "is-loading" : ""}`}>
        {loading && (
          <div className="editor-panel__overlay">
            <div className="spinner" />
            <p>Building your question set…</p>
          </div>
        )}
        <div className="editor-panel__head">
          <h2 className="panel-title">Reading input</h2>
          <span className="char-count">{charCount.toLocaleString()} characters</span>
        </div>
        <form onSubmit={handleGenerate}>
          <div className="editor-wrap">
            <textarea
              className="editor"
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder={SAMPLE_HINT}
              required
              disabled={loading}
              spellCheck={false}
            />
          </div>
          {error && (
            <div className="alert alert--error" role="alert">
              {error}
            </div>
          )}
          <div className="editor-panel__actions">
            <button type="button" className="btn btn--ghost" onClick={loadSample} disabled={loading}>
              Load sample lesson
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading || markdown.trim().length < 50}
            >
              Generate questions
              <span className="btn__arrow" aria-hidden>
                →
              </span>
            </button>
          </div>
        </form>
      </section>

      {recentRuns.length > 0 && (
        <section className="recent">
          <h2 className="section-title">Continue where you left off</h2>
          <div className="recent__grid">
            {recentRuns.map((r) => (
              <Link key={r._id} to={`/review/${r._id}`} className="recent-card">
                <span className="recent-card__title">{r.title || "Untitled lesson"}</span>
                <span className={`recent-card__status recent-card__status--${r.status}`}>
                  {formatStatus(r.status)}
                </span>
                <span className="recent-card__chev" aria-hidden>
                  →
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function formatStatus(status) {
  const map = {
    ready_for_review: "Ready to review",
    exported: "Exported",
    processing: "Processing",
    failed: "Failed",
  };
  return map[status] || status;
}
