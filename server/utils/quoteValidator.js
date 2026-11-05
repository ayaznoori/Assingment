import { findQuoteInSource, normalizeForMatch } from "./parseMarkdown.js";

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

/** For debugging failed runs — why claims were dropped */
export function diagnoseClaimRejection(quote, fullText) {
  const nQuote = normalizeForMatch(quote);
  const nSource = normalizeForMatch(fullText);
  return {
    exact: fullText.includes(quote?.trim()),
    normalizedIncluded: nQuote.length >= 12 && nSource.includes(nQuote),
    anchorIncluded:
      nQuote.length >= 28 && nSource.includes(nQuote.slice(0, 28)),
  };
}
