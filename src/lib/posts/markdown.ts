import { safeExternalUrl } from "@/lib/safe-url";

/**
 * A small, safe Markdown subset for posts. It never produces HTML: the result
 * is plain data that React renders as text, so typed HTML or scripts show up
 * as harmless text.
 *
 *   ## Heading        ### Smaller heading
 *   - bullet          1. numbered item
 *   **bold**          [link text](https://example.gov.pk) or [our books](/books?exam=css-pms)
 *   blank line = new paragraph
 */
export type Inline = { type: "text"; text: string; bold?: boolean } | { type: "link"; text: string; href: string; external: boolean };

export type Block =
  | { type: "h2" | "h3" | "p"; content: Inline[] }
  | { type: "ul" | "ol"; items: Inline[][] };

const INTERNAL = /^\/[A-Za-z0-9/_\-?=&.%]*$/;

/** Only https links to other sites, or paths on this site. Anything else stays plain text. */
export function safeHref(raw: string): { href: string; external: boolean } | null {
  const href = raw.trim();
  if (INTERNAL.test(href) && !href.startsWith("//")) return { href, external: false };
  const ext = safeExternalUrl(href);
  return ext ? { href: ext, external: true } : null;
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  const pattern = /\*\*(.+?)\*\*|\[([^\]\n]{1,200})\]\(([^)\s]{1,2000})\)/g;
  let last = 0;
  for (const m of text.matchAll(pattern)) {
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) });
    if (m[1] !== undefined) {
      out.push({ type: "text", text: m[1], bold: true });
    } else {
      const link = safeHref(m[3]);
      out.push(link ? { type: "link", text: m[2], ...link } : { type: "text", text: m[2] });
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

export function parseMarkdown(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flush = () => {
    if (para.length) blocks.push({ type: "p", content: parseInline(para.join(" ")) });
    if (list) blocks.push({ type: list.type, items: list.items.map(parseInline) });
    para = [];
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: heading[1].length === 2 ? "h2" : "h3", content: parseInline(heading[2]) });
      continue;
    }
    const bullet = /^[-*•]\s+(.+)$/.exec(line);
    const numbered = /^\d{1,3}[.)]\s+(.+)$/.exec(line);
    const item = bullet ?? numbered;
    if (item) {
      const type = bullet ? "ul" : "ol";
      if (para.length || (list && list.type !== type)) flush();
      list ??= { type, items: [] };
      list.items.push(item[1]);
      continue;
    }
    if (list) flush();
    para.push(line.replace(/^#\s+/, "")); // a single "#" is treated as normal text
  }
  flush();
  return blocks;
}

/** Plain text (for the automatic summary and search snippets). */
export function markdownToText(source: string): string {
  return parseMarkdown(source)
    .flatMap((b) => ("content" in b ? [b.content] : b.items))
    .map((inl) => inl.map((i) => i.text).join(""))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
