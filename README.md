# Reading Material → Question Review Workflow

MERN app for the **Fullstack Developer & AI Instructor**.
It takes markdown reading material, runs a grounded question-generation pipeline, lets a **human reviewer** approve / edit / reject each item, and exports **one question group** in tagged XML:

| Slot | Type |
|------|------|
| `theory_mcq_1`, `theory_mcq_2` | Theory MCQ (4 options) |
| `true_false_1`, `true_false_2` | True / False |
| `code_analysis` | Code analysis (uses a code block from the material) |

**Grounding rule:** every question must include a `supporting-quote` that appears in the source. Node validates quotes before review; an LLM “judge” step flags weak items.

---

## Prerequisites

- **Node.js 18+**
- **MongoDB** — one of:
  - **Easiest:** `USE_IN_MEMORY_MONGO=true` in `server/.env` (default in `.env.example`; no Docker)
  - Docker: `docker compose up -d`
  - MongoDB Atlas connection string in `MONGODB_URI`
- **LLM:** **Google Gemini** (recommended) or OpenAI — or `MOCK_LLM=true` for demo without a key

---

## Quick start (clone & run)

```bash
git clone <your-repo-url>
cd nxtwave-ai-fullstack-assignment

# 1) Install dependencies (root + server + client)
npm run install:all

# 2) Start MongoDB (pick one)
cp .env.example server/.env
# Default server/.env uses USE_IN_MEMORY_MONGO=true — skip Docker if you want
# OR: docker compose up -d
# OR: Atlas URI in MONGODB_URI and USE_IN_MEMORY_MONGO=false

# 3) Configure LLM — copy example and add your Gemini key
cp .env.example server/.env
# Edit server/.env: GEMINI_API_KEY=... (https://aistudio.google.com/apikey)

# 4) Run
npm run dev
```

Open **http://localhost:5173** → paste or load sample → **Generate questions** → review each tab → **Export XML**.


---

## Environment variables (`server/.env`)

| Variable | Description |
|----------|-------------|
| `USE_IN_MEMORY_MONGO` | `true` = embedded Mongo (no Docker); data resets when server stops |
| `MONGODB_URI` | Used when `USE_IN_MEMORY_MONGO` is not `true` |
| `PORT` | API port (default `5001`) |
| `CLIENT_ORIGIN` | CORS origin (default `http://localhost:5173`) |
| `MOCK_LLM` | `true` = no API calls (demo; best with sample lesson only) |
| `LLM_PROVIDER` | `gemini` or `openai` (default: gemini if `GEMINI_API_KEY` is set) |
| `GEMINI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/apikey) |
| `GEMINI_MODEL` | Default `gemini-2.0-flash` |
| `OPENAI_API_KEY` | Optional if using OpenAI instead |
| `OPENAI_MODEL` | Default `gpt-4o-mini` |

If `MOCK_LLM` is not `true` and **both** keys are empty, the server uses **mock** generation.

---

## Project structure

```
├── client/                 # React (Vite)
├── server/                 # Express + Mongoose
│   ├── routes/runs.js      # REST API
│   ├── services/
│   │   ├── pipeline.js     # 5-step workflow
│   │   ├── llm.js          # Gemini / OpenAI + mock
│   │   └── export.js       # Tagged XML export
│   └── utils/              # Markdown parse + quote checks
├── sample-reading-material.md
└── docker-compose.yml      # Local MongoDB
```

---

## API (summary)

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/health` | Server / Mongo / mock mode |
| `POST` | `/api/runs` | Body `{ "markdown": "..." }` → generate |
| `GET` | `/api/runs/:id` | Full run + questions |
| `PATCH` | `/api/runs/:id/questions/:questionId` | Reviewer update |
| `POST` | `/api/runs/:id/export` | Tagged XML (all 5 slots approved) |

---

## Export format (tagged XML)

Exported file structure (simplified):

```xml
<question-group id="...">
  <metadata>...</metadata>
  <theory-mcq id="theory_mcq_1">...</theory-mcq>
  <true-false id="true_false_1">...</true-false>
  <code-analysis id="code_analysis">
    <code-snippet><![CDATA[...]]></code-snippet>
    ...
  </code-analysis>
</question-group>
```

Each question includes: `stem`, `options`, `correct-answer`, `explanation`, `supporting-quote`, `section`.

If NxtWave provided a different tag schema in their attachment, align `server/services/export.js` with that file before submission.

---

## Production-style run (optional)

```bash
npm run build          # builds client to client/dist
# Serve static files from Express or deploy client to Vercel/Netlify
# with VITE_API_URL pointing to your API
npm run start          # server only
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Mongo connection failed` | Set `USE_IN_MEMORY_MONGO=true` in `server/.env`, or Docker / Atlas |
| Pipeline 500 / few claims | Use richer markdown; try `MOCK_LLM=true` to verify UI |
| Export button disabled | Approve (or edit + approve) all **5** slots |
| First server start slow | In-memory mode downloads MongoDB binary once (~70MB) |
| CORS errors | Set `CLIENT_ORIGIN` to your frontend URL |

---

## Assignment checklist

- [x] Markdown in → one 5-question group out  
- [x] 2 MCQ, 2 T/F, 1 code-analysis  
- [x] Reviewer UI: judge quality, edit, approve/reject  
- [x] React frontend + Node/Express backend + MongoDB  
- [x] Grounding: quote substring validation + judge step  

---

## License

MIT — submission project for interview assignment.
