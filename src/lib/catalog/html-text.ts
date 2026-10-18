const entities: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  hellip: "…",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return entities[code.toLowerCase()] ?? match;
  });
}

/**
 * Converts imported product HTML into plain-text blocks.
 * Output is text only (never HTML), so it is safe to render with React.
 * List items become lines starting with "• ".
 */
export function htmlToTextBlocks(html: string | null | undefined): string[] {
  if (!html) return [];
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|ul|ol|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  return (
    decodeEntities(text)
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      // "✓ A✓ B✓ C" written on one line becomes separate list items.
      .flatMap((line) => {
        const parts = line.split(/\s*[✓✔]\s*/).filter(Boolean);
        return parts.length > 1 || /^[✓✔]/.test(line) ? parts.map((p) => `• ${p.trim()}`) : [line];
      })
      .filter((line) => line && line !== "•")
  );
}
