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
  if (process.env.MOCK_LLM === "true" || !process.env.OPENAI_API_KEY) {
    if (process.env.MOCK_LLM !== "true" && !process.env.OPENAI_API_KEY) {
      console.warn("[llm] No OPENAI_API_KEY — using mock claims for this run.");
    }
    return MOCK_CLAIMS.filter((c) => quoteInText(fullText, c.supportingQuote));
  }

  const sectionSummary = sections
    .map((s) => `### ${s.title}\n${s.body.slice(0, 800)}`)
    .join("\n\n");

  const system = `You extract teachable facts ONLY from the provided reading. Return JSON: { "claims": [ { "claim", "supportingQuote", "sectionTitle" } ] }. supportingQuote MUST be an exact substring copied from the reading (preserve punctuation). At least 5 claims. No outside knowledge.`;

  const user = `Reading:\n\n${fullText.slice(0, 12000)}\n\nSections preview:\n${sectionSummary}`;

  const json = await chatJson(system, user);
  return json.claims || [];
}

export async function generateQuestionForSlot({ slot, type, claim, codeBlocks, fullText }) {
  if (process.env.MOCK_LLM === "true" || !process.env.OPENAI_API_KEY) {
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

  const user = `Claim: ${claim.claim}\nQuote: ${claim.supportingQuote}\nSection: ${claim.sectionTitle}\n${codeHint}\n\nReading excerpt:\n${fullText.slice(0, 6000)}`;

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
  if (process.env.MOCK_LLM === "true" || !process.env.OPENAI_API_KEY) {
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

Reading (first 4000 chars):
${fullText.slice(0, 4000)}`;

  return chatJson(system, user);
}

async function chatJson(system, user) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
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
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty LLM response");
  return JSON.parse(content);
}

export { mockQuestions };
