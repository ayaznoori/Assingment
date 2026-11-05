/** When true, use canned closure sample data (no API calls). */
export function useMockLlm() {
  if (process.env.MOCK_LLM === "true") return true;
  if (
    process.env.GEMINI_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    process.env.OPENROUTER_API_KEY?.trim()
  ) {
    return false;
  }
  return true;
}

/** gemini | openai | openrouter */
export function resolveLlmProvider() {
  const forced = process.env.LLM_PROVIDER?.toLowerCase();
  if (forced === "gemini" || forced === "openai" || forced === "openrouter") {
    return forced;
  }
  if (process.env.OPENROUTER_API_KEY?.trim()) return "openrouter";
  if (process.env.GEMINI_API_KEY?.trim()) return "gemini";
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  return "none";
}

export function llmStatusForHealth() {
  if (useMockLlm()) {
    return { mode: "mock", provider: null };
  }
  const provider = resolveLlmProvider();
  return { mode: "live", provider };
}
