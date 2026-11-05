# Interview & recording guide (Part B)

Use this alongside the running app in **`README.md`**. Target recording length: **10–15 minutes**, face on camera.

---

## What you built (30-second pitch)

> “I built a MERN workflow for content reviewers. They paste reading material in markdown; the backend parses it, extracts teachable claims with **exact quotes**, generates exactly one group of five questions—two theory MCQs, two true/false, one code-analysis—and then a reviewer approves, edits, or rejects each question before export to tagged XML. The core rule is grounding: if the material doesn’t teach it, the question shouldn’t ship. I enforce that with substring quote checks in Node plus an LLM judge, and the human has final say.”

---

## Demo flow (live on screen)

Do this in order during the recording:

1. **Home** — show badges (Mongo OK, Mock vs Live LLM).
2. Load **`sample-reading-material.md`** (button or paste).
3. **Run pipeline** — open review page; briefly show the five pipeline steps.
4. Pick one **ungrounded/warn** tab if any; show **supporting quote** highlighted in source.
5. **Edit** one question (reword stem) → **Save edits** → **Approve**.
6. Approve remaining four → **Export tagged XML** → scroll the export.
7. Switch to **teaching** segment (below).

Keep a **completed run bookmarked** (`/review/<id>`) in case the API is slow during recording.

---

## Architecture talking points (2–3 minutes)

Draw or narrate this pipeline:

```
Markdown → parse sections/code
        → extract claims (each with supporting_quote)
        → filter claims (quote must exist in source text)
        → plan 5 slots
        → generate per slot (MCQ / T-F / code)
        → validate quotes again
        → LLM judge (answerable from material only?)
        → reviewer UI → export XML
```

### Why MERN (your profile)

- **React**: review UI with side-by-side source + questions.
- **Express**: REST API, easy to show in interview.
- **MongoDB**: store runs, pipeline step status, reviewer edits (fits assignment MERN stack).
- **Python**: basic familiarity only; you chose Node so the submission is one stack you own end-to-end.

### Why not RAG here?

- Single document fits in context; retrieval adds wrong-chunk risk.
- Grounding is enforced by **exact quote checks**, not by “similar chunks.”

### When you *would* add RAG / agents

- **RAG**: large library of many `.md` files; retrieve relevant sections before generation.
- **Agents (LangGraph etc.)**: multi-step loops with human-in-the-loop pause/resume across days; tool calls to CMS, LMS, or plagiarism checks.

You don’t need to name-drop LangChain unless asked—you used plain `fetch` to OpenAI with JSON mode for clarity.

### Models & tools

| Piece | Choice | Why |
|-------|--------|-----|
| LLM | `gpt-4o-mini` (configurable) | Cheap, fast, good JSON for structured questions |
| Mock mode | `MOCK_LLM=true` | Reviewers clone repo without API keys |
| Validation | Node string checks | Deterministic; models lie, code shouldn’t |
| Judge | Second LLM call | Catches “quote present but question tests something else” |

---

## Teaching segment (5–6 minutes)

Teach **one concept from the same reading** you used in the demo—e.g. **closures** from `sample-reading-material.md`.

Suggested structure (beginner-friendly):

1. **Outcome**: “After this, you’ll know what a closure is and recognize one in code.”
2. **Story first**: outer function runs, inner function still remembers `count`.
3. **Definition** in plain English (from the doc, not Wikipedia).
4. **Live code**: `makeCounter` — line-by-line, one minute.
5. **Common mistake**: `var` + `setTimeout` loop (from the material).
6. **Check**: ask one MCQ your tool generated; pause; answer using only the reading.

**Delivery tips**

- Look at the **camera** for explanations; look at the **screen** only when pointing at code.
- No jargon dump: one idea, one example, one mistake.
- Tie back to assignment: “Our MCQ only tests what this paragraph states…”

---

## Questions they may ask you

Prepare short answers:

1. **How do you prevent hallucinated questions?**  
   Claims require quotes → filter → regenerate slot → judge → human reviewer.

2. **What if the material has no code?**  
   Code-analysis slot surfaces a reviewer warning; don’t invent snippets.

3. **How would you scale this?**  
   Queue jobs (BullMQ), version content, reviewer roles, diff on edits, analytics on which slots fail most.

4. **Tradeoffs of mock mode?**  
   Great for UX/QA; production needs live LLM + monitoring on judge failure rate.

5. **What would you improve in v2?**  
   Distractor quality rubric, difficulty tags, reviewer comments fed back into prompts, batch export, auth.

6. **AI in education concerns?**  
   Human review, source citations, audit trail in Mongo, reject button for policy violations.

---

## Pre-recording checklist

- [ ] `docker compose up -d` (or Atlas URI set)
- [ ] `server/.env` — decide Mock vs Live API for demo
- [ ] Run through once: generate → approve 5 → export
- [ ] Browser zoom ~110%; close unrelated tabs
- [ ] Mic + camera test; quiet room
- [ ] Timer rehearsal (~13 min)
- [ ] Replace `sample-reading-material.md` with **NxtWave’s official attachment** if they gave one (re-test pipeline)

---

## GitHub submission notes

1. Push this folder as its own repo (not mixed with other projects).
2. Pin **`README.md`** quick start at top of repo description.
3. In submission email/form: repo link + note “Set `MOCK_LLM=true` in `server/.env` to test without OpenAI.”
4. Optional: add a **2-minute Loom** only if they allow extra links; primary ask is face cam recording.

---

## Honesty line for “basic Python”

If asked about Python backend:

> “I’m stronger on MERN; I can read and write small Python scripts for APIs or data cleanup, but I built this assignment in Node so I can maintain and extend it confidently. I’m happy to pick up FastAPI on the job for internal tools.”

That matches the JD without overselling.

---

## Role fit (why you care)

One sentence to close the video:

> “I like building real software and explaining it clearly—this role is exactly that, plus shaping how AI-assisted content stays accurate for learners across India.”

Good luck.
