import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createRun, getHealth, listRuns } from "./api/client.js";
import PipelineSteps from "./components/PipelineSteps.jsx";
import ReviewPage from "./pages/ReviewPage.jsx";

const SAMPLE_HINT = "Paste markdown reading material, or load sample-reading-material.md from the repo.";

export default function App() {
  const { runId } = useParams();
  const navigate = useNavigate();
  const [markdown, setMarkdown] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [health, setHealth] = useState(null);
  const [recentRuns, setRecentRuns] = useState([]);
  const [liveSteps, setLiveSteps] = useState([]);

  useEffect(() => {
    getHealth().then(setHealth).catch(() => setHealth({ ok: false }));
    listRuns().then(setRecentRuns).catch(() => {});
  }, []);

  if (runId) {
    return <ReviewPage runId={runId} />;
  }

  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setLiveSteps([]);
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
      if (!res.ok) throw new Error("Open sample-reading-material.md from repo root and paste it.");
      setMarkdown(await res.text());
    } catch {
      setError("Could not load sample file in dev — paste content from sample-reading-material.md");
    }
  }

  return (
    <div className="layout">
      <header className="header">
        <div>
          <h1>Reading → Question Review Workflow</h1>
          <p className="muted">
            Generates one group: 2 theory MCQs, 2 true/false, 1 code-analysis — then human review & export.
          </p>
        </div>
        {health && (
          <div className="badges">
            <span className={health.mongo ? "badge ok" : "badge warn"}>Mongo {health.mongo ? "OK" : "?"}</span>
            <span className={health.mockLlm ? "badge" : "badge ok"}>
              {health.mockLlm ? "Mock LLM" : "Live LLM"}
            </span>
          </div>
        )}
      </header>

      <main className="grid-two">
        <section className="card">
          <h2>1. Input reading material</h2>
          <form onSubmit={handleGenerate}>
            <textarea
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              rows={18}
              placeholder={SAMPLE_HINT}
              required
            />
            <div className="row">
              <button type="button" className="secondary" onClick={loadSample}>
                Try load sample (dev)
              </button>
              <button type="submit" disabled={loading || markdown.trim().length < 50}>
                {loading ? "Generating…" : "Run pipeline"}
              </button>
            </div>
          </form>
          {error && <p className="error">{error}</p>}
          {liveSteps.length > 0 && <PipelineSteps steps={liveSteps} />}
        </section>

        <section className="card">
          <h2>How it works</h2>
          <ol className="steps-list">
            <li>Parse markdown sections & code blocks</li>
            <li>Extract teachable claims with exact quotes</li>
            <li>Plan five slots (2 MCQ, 2 T/F, 1 code)</li>
            <li>Draft questions only from those claims</li>
            <li>Auto-judge + reviewer approve / edit / reject</li>
            <li>Export tagged XML when all five are approved</li>
          </ol>
          <p className="muted">
            Rule enforced: questions must be answerable from the material. Quotes are substring-checked in Node
            before review.
          </p>

          <h3>Recent runs</h3>
          <ul className="runs-list">
            {recentRuns.length === 0 && <li className="muted">No runs yet</li>}
            {recentRuns.map((r) => (
              <li key={r._id}>
                <Link to={`/review/${r._id}`}>{r.title || "Untitled"}</Link>
                <span className="muted"> — {r.status}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
