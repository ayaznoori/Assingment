import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getRun, listRuns, startRun } from "./api/client.js";
import GenerationProgress from "./components/GenerationProgress.jsx";
import ReviewPage from "./pages/ReviewPage.jsx";

const SAMPLE_HINT = "Paste markdown reading material here — use ## headings and ``` code fences where needed.";

export default function App() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [recentRuns, setRecentRuns] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [pipelineSteps, setPipelineSteps] = useState([]);
  const [uploadName, setUploadName] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    listRuns().then(setRecentRuns).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeRunId || !loading) return undefined;

    let cancelled = false;

    const poll = async () => {
      try {
        const run = await getRun(activeRunId);
        if (cancelled) return;
        setPipelineSteps(run.pipelineSteps || []);

        if (run.status === "ready_for_review") {
          setLoading(false);
          setActiveRunId(null);
          navigate(`/review/${activeRunId}`);
        } else if (run.status === "failed") {
          setLoading(false);
          setActiveRunId(null);
          setError(run.errorMessage || "Generation failed");
        }
      } catch {
        /* keep polling */
      }
    };

    poll();
    const timer = setInterval(poll, 500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [activeRunId, loading, navigate]);

  if (runId) {
    return <ReviewPage runId={runId} />;
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setPipelineSteps([]);
    try {
      const started = await startRun(markdown);
      setActiveRunId(started._id);
      setPipelineSteps(started.pipelineSteps || []);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  }

  async function loadSample() {
    setError("");
    try {
      const res = await fetch("/sample-reading-material.md");
      if (!res.ok) throw new Error("Sample not found");
      setMarkdown(await res.text());
      setUploadName("sample-reading-material.md");
    } catch {
      setError("Paste content from sample-reading-material.md in the repo root.");
    }
  }

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    const name = file.name.toLowerCase();
    const okExt = name.endsWith(".md") || name.endsWith(".markdown") || name.endsWith(".txt");
    if (!okExt) {
      setError("Please upload a .md, .markdown, or .txt file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("File is too large (max 2 MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      if (text.trim().length < 50) {
        setError("File is too short — need at least ~50 characters of content.");
        return;
      }
      setMarkdown(text);
      setUploadName(file.name);
    };
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsText(file);
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

      <section className="editor-panel">
        <div className="editor-panel__head">
          <div>
            <h2 className="panel-title">Reading input</h2>
            {uploadName && <p className="upload-name">Loaded: {uploadName}</p>}
          </div>
          <span className="char-count">{charCount.toLocaleString()} characters</span>
        </div>
        <form onSubmit={handleGenerate}>
          <input
            ref={fileInputRef}
            type="file"
            className="file-input-hidden"
            accept=".md,.markdown,.txt,text/markdown,text/plain"
            onChange={handleFileChange}
            disabled={loading}
            aria-hidden
            tabIndex={-1}
          />
          <div className="editor-wrap">
            <textarea
              className="editor"
              value={markdown}
              onChange={(e) => {
                setMarkdown(e.target.value);
                if (uploadName) setUploadName("");
              }}
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
            <button type="button" className="btn btn--secondary" onClick={handleUploadClick} disabled={loading}>
              Upload .md file
            </button>
            <button type="button" className="btn btn--ghost" onClick={loadSample} disabled={loading}>
              Load sample lesson
            </button>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading || markdown.trim().length < 50}
            >
              {loading ? "Generating…" : "Generate questions"}
              {!loading && (
                <span className="btn__arrow" aria-hidden>
                  →
                </span>
              )}
            </button>
          </div>
        </form>

        {loading && pipelineSteps.length > 0 && (
          <div className="editor-panel__progress">
            <GenerationProgress steps={pipelineSteps} />
          </div>
        )}
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
