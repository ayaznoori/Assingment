import { findQuoteInSource } from "./parseMarkdown.js";

function isGroundedQuote(quote, fullText) {
  if (findQuoteInSource(quote, fullText)) return true;
  const stripped = quote.replace(/\*\*/g, "").replace(/`/g, "");
  return findQuoteInSource(stripped, fullText);
}

export function filterGroundedClaims(claims, fullText) {
  return claims.filter((c) => {
    const ok = isGroundedQuote(c.supportingQuote, fullText);
    return ok && c.claim && c.supportingQuote;
  });
}

export function validateQuestionQuotes(questions, fullText) {
  return questions.map((q) => ({
    ...q,
    grounded: isGroundedQuote(q.supportingQuote, fullText),
  }));
}
