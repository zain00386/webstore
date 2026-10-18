/** Renders plain-text description blocks; "• " lines are grouped into lists. Text only, never HTML. */
export function Description({ blocks }: { blocks: string[] }) {
  const groups: { type: "p" | "ul"; lines: string[] }[] = [];
  for (const line of blocks) {
    const isItem = line.startsWith("• ");
    const last = groups.at(-1);
    if (isItem && last?.type === "ul") last.lines.push(line.slice(2));
    else groups.push({ type: isItem ? "ul" : "p", lines: [isItem ? line.slice(2) : line] });
  }

  return (
    <div className="space-y-3 text-sm leading-relaxed text-foreground/85">
      {groups.map((g, i) =>
        g.type === "ul" ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {g.lines.map((l, j) => (
              <li key={j}>{l}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{g.lines[0]}</p>
        ),
      )}
    </div>
  );
}
