import Link from "next/link";
import { parseMarkdown, type Inline } from "@/lib/posts/markdown";

/** Renders a post's Markdown as React elements (never as raw HTML). */
export function PostBody({ markdown }: { markdown: string }) {
  const blocks = parseMarkdown(markdown);
  return (
    <div className="space-y-4 leading-relaxed wrap-anywhere text-foreground/85">
      {blocks.map((b, i) => {
        if ("content" in b) {
          if (b.type === "h2") return <h2 key={i} className="pt-4 text-xl font-semibold text-foreground"><Inlines items={b.content} /></h2>;
          if (b.type === "h3") return <h3 key={i} className="pt-2 text-lg font-semibold text-foreground"><Inlines items={b.content} /></h3>;
          return <p key={i}><Inlines items={b.content} /></p>;
        }
        const List = b.type;
        return (
          <List key={i} className={`${b.type === "ul" ? "list-disc" : "list-decimal"} space-y-1.5 pl-5`}>
            {b.items.map((item, j) => (
              <li key={j}>
                <Inlines items={item} />
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}

function Inlines({ items }: { items: Inline[] }) {
  return items.map((it, i) => {
    if (it.type === "link") {
      return it.external ? (
        <a key={i} href={it.href} target="_blank" rel="noopener noreferrer nofollow" className="font-medium text-brand underline underline-offset-4">
          {it.text}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <Link key={i} href={it.href} className="font-medium text-brand underline underline-offset-4">
          {it.text}
        </Link>
      );
    }
    return it.bold ? <strong key={i} className="font-semibold text-foreground">{it.text}</strong> : <span key={i}>{it.text}</span>;
  });
}
