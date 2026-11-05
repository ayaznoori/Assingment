/**
 * Split markdown into sections (by ## headings) and collect fenced code blocks.
 */
export function parseMarkdown(markdown) {
  const lines = markdown.split(/\r?\n/);
  const sections = [];
  let current = { title: "Introduction", bodyLines: [] };
  const codeBlocks = [];

  let inFence = false;
  let fenceLang = "";
  let fenceLines = [];

  for (const line of lines) {
    const fenceMatch = line.match(/^```(\w*)/);
    if (fenceMatch) {
      if (!inFence) {
        inFence = true;
        fenceLang = fenceMatch[1] || "text";
        fenceLines = [];
      } else {
        inFence = false;
        const code = fenceLines.join("\n");
        codeBlocks.push({
          language: fenceLang,
          code,
          sectionTitle: current.title,
        });
        current.bodyLines.push(line);
        fenceLines = [];
      }
      continue;
    }

    if (inFence) {
      fenceLines.push(line);
      continue;
    }

    const heading = line.match(/^##\s+(.+)/);
    if (heading) {
      if (current.bodyLines.length > 0 || sections.length === 0) {
        sections.push({
          title: current.title,
          body: current.bodyLines.join("\n").trim(),
        });
      }
      current = { title: heading[1].trim(), bodyLines: [] };
      continue;
    }

    current.bodyLines.push(line);
  }

  sections.push({
    title: current.title,
    body: current.bodyLines.join("\n").trim(),
  });

  return {
    fullText: markdown,
    sections: sections.filter((s) => s.body.length > 0 || s.title),
    codeBlocks,
  };
}

export function findQuoteInSource(quote, fullText) {
  if (!quote || !fullText) return false;
  const normalizedQuote = quote.trim();
  if (fullText.includes(normalizedQuote)) return true;
  const collapsed = normalizedQuote.replace(/\s+/g, " ");
  const collapsedSource = fullText.replace(/\s+/g, " ");
  return collapsedSource.includes(collapsed);
}

export function excerptAroundQuote(fullText, quote, radius = 120) {
  const idx = fullText.indexOf(quote.trim());
  if (idx === -1) return quote;
  const start = Math.max(0, idx - radius);
  const end = Math.min(fullText.length, idx + quote.length + radius);
  return fullText.slice(start, end);
}
