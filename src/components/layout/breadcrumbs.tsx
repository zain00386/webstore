import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-5 text-xs text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex min-w-0 items-center gap-1">
              {item.href && !last ? (
                <Link href={item.href} className="hover:text-foreground hover:underline">
                  {item.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className="line-clamp-1 text-foreground">
                  {item.label}
                </span>
              )}
              {!last && <ChevronRight className="size-3 shrink-0" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
