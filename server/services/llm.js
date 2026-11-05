import { resolveLlmProvider, useMockLlm } from "./llmConfig.js";

const MOCK_CLAIMS = [
  {
    claim: "A closure is when a function remembers variables from where it was created.",
    supportingQuote:
      "A **closure** is when a function remembers variables from the place where it was created, even after that outer function has finished running.",
    sectionTitle: "Introduction",
  },
  {
    claim: "Closures allow private data with exposed behavior.",
    supportingQuote: "Closures let you keep private data while still exposing behavior.",
    sectionTitle: "Why closures matter",
  },
  {
    claim: "The inner function in makeCounter closes over count.",
    supportingQuote:
      "Here, the inner function closes over `count`. Each call to `counter()` updates the same `count` variable.",
    sectionTitle: "Example",
  },
  {
    claim: "var in a loop with setTimeout often logs the final value repeatedly.",
    supportingQuote:
      "Without `let` or an IIFE, all callbacks may see the final value of `var i`.",
    sectionTitle: "Common mistake",
  },
  {
    claim: "let gives each loop iteration its own binding.",
    supportingQuote:
      "Using `let` in the loop gives each iteration its own binding, which fixes the behavior.",
    sectionTitle: "Common mistake",
  },
];

function mockQuestions(codeBlocks) {
  const code =
    codeBlocks[0]?.code ||
    "function makeCounter() {\n  let count = 0;\n  return function () {\n    count += 1;\n    return count;\n  };\n}";

  return [
    {
      slot: "theory_mcq_1",
      type: "theory_mcq",
      stem: "According to the material, what is a closure?",
      options: [
        { key: "A", text: "A function that remembers variables from where it was created" },
        { key: "B", text: "A syntax error in nested functions" },
        { key: "C", text: "A way to delete outer variables automatically" },
        { key: "D", text: "A type of JavaScript loop" },
      ],
      correctAnswer: "A",
      explanation:
        "The introduction defines a closure as a function remembering variables from its creation environment.",
      supportingQuote:
        "A **closure** is when a function remembers variables from the place where it was created, even after that outer function has finished running.",
      sectionTitle: "Introduction",
      codeSnippet: "",
    },
    {
      slot: "theory_mcq_2",
      type: "theory_mcq",
      stem: "Why are closures useful according to the reading?",
      options: [
        { key: "A", text: "They replace all global variables" },
        { key: "B", text: "They keep private data while exposing behavior" },
        { key: "C", text: "They speed up every loop" },
        { key: "D", text: "They prevent using callbacks" },
      ],
      correctAnswer: "B",
      explanation: "The material states closures help keep private data with exposed behavior.",
      supportingQuote: "Closures let you keep private data while still exposing behavior.",
      sectionTitle: "Why closures matter",
      codeSnippet: "",
    },
    {
      slot: "true_false_1",
      type: "true_false",
      stem: "In the makeCounter example, each call to counter() updates the same count variable.",
      options: [
        { key: "True", text: "True" },
        { key: "False", text: "False" },
      ],
      correctAnswer: "True",
      explanation:
        "The text says each call updates the same count variable closed over by the inner function.",
      supportingQuote:
        "Here, the inner function closes over `count`. Each call to `counter()` updates the same `count` variable.",
      sectionTitle: "Example",
      codeSnippet: "",
    },
    {
      slot: "true_false_2",
      type: "true_false",
      stem: "Using var in a for-loop with setTimeout always prints 0, 1, 2 as intended.",
      options: [
        { key: "True", text: "True" },
        { key: "False", text: "False" },
      ],
      correctAnswer: "False",
      explanation:
        "The material warns that callbacks may see the final value of var i, often printing 3 three times.",
      supportingQuote:
        "Without `let` or an IIFE, all callbacks may see the final value of `var i`.",
      sectionTitle: "Common mistake",
      codeSnippet: "",
    },
    {
      slot: "code_analysis",
      type: "code_analysis",
      stem: "What will the two console.log(counter()) calls print after makeCounter runs?",
      options: [
        { key: "A", text: "1 then 2" },
        { key: "B", text: "0 then 0" },
        { key: "C", text: "2 then 1" },
        { key: "D", text: "undefined then undefined" },
      ],
      correctAnswer: "A",
      explanation: "The sample output in the material shows 1 and then 2.",
      supportingQuote: "console.log(counter()); // 1",
      sectionTitle: "Example",
      codeSnippet: code,
    },
  ];
}

function quoteInText(fullText, quote) {
  const q = quote.replace(/\*\*/g, "").trim();
  return fullText.includes(quote.trim()) || fullText.includes(q) || fullText.includes(q.slice(0, 30));
}

export async function extractTeachableClaims(parsed) {
  const { fullText, sections } = parsed;
  if (useMockLlm()) {
    if (process.env.MOCK_LLM !== "true") {
      console.warn("[llm] No API key — using mock claims. Set OPENROUTER_API_KEY, GEMINI_API_KEY, or OPENAI_API_KEY.");
    }
    return MOCK_CLAIMS.filter((c) => quoteInText(fullText, c.supportingQuote));
  }

  const sectionSummary = sections
    .map((s) => `### ${s.title}\n${s.body.slice(0, 800)}`)
    .join("\n\n");

  const system = `You extract teachable facts ONLY from the provided reading. Return JSON: { "claims": [ { "claim", "supportingQuote", "sectionTitle" } ] }.

Rules for supportingQuote:
- MUST be copied verbatim from a normal sentence or bullet line in the reading (character-accurate).
- Do NOT quote markdown table rows (lines with | pipes).
- Do NOT paraphrase or fix grammar.
- Prefer plain paragraphs over tables and code blocks.
- At least 5 claims. No outside knowledge.

Output ONLY a single JSON object. No markdown fences, no explanation, no chain-of-thought.`;

  const user = `Reading:\n\n${fullText.slice(0, 8000)}\n\nSections preview:\n${sectionSummary}`;

  const json = await chatJson(system, user);
  return json.claims || [];
}

export async function generateQuestionForSlot({ slot, type, claim, codeBlocks, fullText }) {
  if (useMockLlm()) {
    const all = mockQuestions(codeBlocks);
    return all.find((q) => q.slot === slot);
  }

  const codeHint =
    type === "code_analysis" && codeBlocks.length
      ? `Use ONLY this code block:\n\`\`\`\n${codeBlocks[0].code}\n\`\`\``
      : "No invented code.";

  const system = `Write ONE assessment question grounded ONLY in the claim and quote. Return JSON:
{
  "stem": string,
  "options": [{"key":"A|B|C|D or True|False","text":string}],
  "correctAnswer": string,
  "explanation": string,
  "supportingQuote": string (exact substring from reading),
  "sectionTitle": string,
  "codeSnippet": string (required for code_analysis, else "")
}
Type: ${type}. Slot: ${slot}. Do NOT test anything not in the quote.`;

  const user = `Claim: ${claim.claim}\nQuote: ${claim.supportingQuote}\nSection: ${claim.sectionTitle}\n${codeHint}\n\nReading excerpt:\n${fullText.slice(0, 3500)}`;

  const json = await chatJson(system, user);
  return {
    slot,
    type,
    stem: json.stem,
    options: json.options,
    correctAnswer: json.correctAnswer,
    explanation: json.explanation,
    supportingQuote: json.supportingQuote,
    sectionTitle: json.sectionTitle || claim.sectionTitle,
    codeSnippet: json.codeSnippet || "",
  };
}

export async function judgeQuestion({ question, fullText }) {
  if (useMockLlm()) {
    const grounded = quoteInText(fullText, question.supportingQuote);
    return {
      pass: grounded,
      notes: grounded ? "Mock judge: quote appears in source." : "Mock judge: weak quote match.",
    };
  }

  const system = `You are a strict content reviewer. Can a beginner answer this question using ONLY the supporting quote and reading? Reply JSON: { "pass": boolean, "notes": string }. Fail if the question requires outside knowledge or misreads the material.`;

  const user = `Question (${question.type}): ${question.stem}
Options: ${JSON.stringify(question.options)}
Correct: ${question.correctAnswer}
Explanation: ${question.explanation}
Quote: ${question.supportingQuote}

Reading (first 2500 chars):
${fullText.slice(0, 2500)}`;

  return chatJson(system, user);
}

async function chatJson(system, user) {
  const provider = resolveLlmProvider();
  if (provider === "gemini") return chatJsonGemini(system, user);
  if (provider === "openai") return chatJsonOpenAI(system, user);
  if (provider === "openrouter") return chatJsonOpenRouter(system, user);
  throw new Error("No LLM provider configured");
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url, options, label = "API") {
  const maxAttempts = Number(process.env.LLM_RETRY_ATTEMPTS || 4);
  const retryable = new Set([429, 500, 502, 503, 504]);
  let lastErr = "";

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, options);
    if (res.ok) return res;

    lastErr = await res.text();
    if (!retryable.has(res.status) || attempt === maxAttempts) {
      if (res.status === 402) {
        throw new Error(
          `${label} error 402: Insufficient OpenRouter credits. Add credits at openrouter.ai/settings/credits, or set OPENROUTER_MAX_TOKENS=800 and use a smaller/cheaper model. Details: ${lastErr}`
        );
      }
      throw new Error(`${label} error ${res.status}: ${lastErr}`);
    }
    const waitMs = Math.min(8000, 1000 * 2 ** (attempt - 1));
    console.warn(`[llm] ${label} ${res.status}, retry ${attempt}/${maxAttempts} in ${waitMs}ms`);
    await sleep(waitMs);
  }

  throw new Error(`${label} failed: ${lastErr}`);
}

async function chatJsonGemini(system, user) {
  const key = process.env.GEMINI_API_KEY.trim();
  const primary = process.env.GEMINI_MODEL || "gemini-2.0-flash";
  const fallback = process.env.GEMINI_FALLBACK_MODEL || "gemini-1.5-flash";
  const models = [primary, fallback].filter((m, i, arr) => m && arr.indexOf(m) === i);

  let lastError;
  for (const model of models) {
    try {
      return await chatJsonGeminiOnce({ key, model, system, user });
    } catch (e) {
      lastError = e;
      const msg = String(e.message);
      const overloaded =
        msg.includes("503") || msg.includes("UNAVAILABLE") || msg.includes("429");
      if (!overloaded || model === models[models.length - 1]) break;
      console.warn(`[llm] Switching Gemini model ${model} → next fallback`);
    }
  }
  throw lastError;
}

async function chatJsonGeminiOnce({ key, model, system, user }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const res = await fetchWithRetry(
    url,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
    `Gemini (${model})`
  );

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const block = data.candidates?.[0]?.finishReason || data.promptFeedback;
    throw new Error(`Empty Gemini response: ${JSON.stringify(block)}`);
  }
  return JSON.parse(text);
}

async function chatJsonOpenAI(system, user) {
  const res = await fetchWithRetry(
    "https://api.openai.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    },
    "OpenAI"
  );

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty LLM response");
  return JSON.parse(content);
}

function openRouterHeaders() {
  const headers = {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY.trim()}`,
    "Content-Type": "application/json",
  };
  if (process.env.OPENROUTER_SITE_URL?.trim()) {
    headers["HTTP-Referer"] = process.env.OPENROUTER_SITE_URL.trim();
  }
  if (process.env.OPENROUTER_APP_NAME?.trim()) {
    headers["X-Title"] = process.env.OPENROUTER_APP_NAME.trim();
  }
  return headers;
}

async function chatJsonOpenRouter(system, user) {
  const primary = process.env.OPENROUTER_MODEL || "google/gemini-2.0-flash-001";
  const fallback =
    process.env.OPENROUTER_FALLBACK_MODEL || "google/gemini-flash-1.5-8b";
  const models = [primary, fallback].filter((m, i, arr) => m && arr.indexOf(m) === i);
  const baseMax = Number(process.env.OPENROUTER_MAX_TOKENS || 4096);

  let lastError;
  for (const model of models) {
    for (const maxTokens of [baseMax, Math.min(16384, baseMax * 2)]) {
      try {
        return await chatJsonOpenRouterOnce({ model, system, user, maxTokensOverride: maxTokens });
      } catch (e) {
        lastError = e;
        const msg = String(e.message);
        const retryable =
          msg.includes("503") ||
          msg.includes("429") ||
          msg.includes("502") ||
          msg.includes("max_tokens");
        if (!retryable) break;
        if (maxTokens === baseMax) {
          console.warn(`[llm] OpenRouter retry ${model} with max_tokens=${Math.min(16384, baseMax * 2)}`);
          continue;
        }
      }
      break;
    }
    const msg = String(lastError?.message || "");
    const switchModel =
      msg.includes("503") || msg.includes("429") || msg.includes("502") || msg.includes("Empty");
    if (!switchModel || model === models[models.length - 1]) break;
    console.warn(`[llm] OpenRouter switching model ${model} → fallback`);
  }
  throw lastError;
}

async function chatJsonOpenRouterOnce({ model, system, user, maxTokensOverride }) {
  const maxTokens = maxTokensOverride ?? Number(process.env.OPENROUTER_MAX_TOKENS || 4096);

  const res = await fetchWithRetry(
    "https://openrouter.ai/api/v1/chat/completions",
    {
      method: "POST",
      headers: openRouterHeaders(),
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `${system}\n\nReply with JSON only — no reasoning or preamble.`,
          },
          { role: "user", content: user },
        ],
      }),
    },
    `OpenRouter (${model})`
  );

  const data = await res.json();
  return parseOpenRouterJson(data, model, maxTokens);
}

function parseOpenRouterJson(data, model, maxTokensUsed) {
  const choice = data.choices?.[0];
  const message = choice?.message;
  const finish = choice?.finish_reason || choice?.native_finish_reason;

  let raw = message?.content?.trim();
  if (!raw && message?.reasoning) {
    raw = extractJsonFromText(message.reasoning);
  }

  if (!raw) {
    if (finish === "length") {
      throw new Error(
        `OpenRouter model "${model}" hit max_tokens (${maxTokensUsed}) before producing JSON. ` +
          `Reasoning models (e.g. nemotron) use tokens for "thinking" and leave content empty. ` +
          `Set OPENROUTER_MAX_TOKENS=8192 or switch to google/gemini-2.0-flash-001 (non-reasoning).`
      );
    }
    throw new Error(
      `Empty OpenRouter JSON content from "${model}". Use a model that returns message.content, not reasoning-only output.`
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    const extracted = extractJsonFromText(raw);
    if (extracted) return JSON.parse(extracted);
    throw new Error(`OpenRouter returned non-JSON from "${model}": ${raw.slice(0, 200)}…`);
  }
}

function extractJsonFromText(text) {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    const lastBrace = trimmed.lastIndexOf("}");
    if (lastBrace > 0) return trimmed.slice(0, lastBrace + 1);
  }
  const match = text.match(/\{[\s\S]*"claims"[\s\S]*\}/);
  if (match) return match[0];
  const generic = text.match(/\{[\s\S]*\}/);
  return generic ? generic[0] : null;
}

export { mockQuestions, useMockLlm };
