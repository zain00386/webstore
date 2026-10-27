import type { ComponentType, ReactNode } from "react";
import DefaultLink from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageCount: number;
  hrefFor: (page: number) => string;
  /** Link component, e.g. one that keeps the old results on screen while the next page loads. */
  link?: ComponentType<{ href: string; className?: string; children: ReactNode; "aria-label"?: string; "aria-current"?: "page" }>;
};

/** Page numbers to show: first, last, current ±1, with gaps. */
function pageList(page: number, pageCount: number): (number | "gap")[] {
  const pages = new Set([1, pageCount, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pageCount));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? (["gap", p] as const) : [p]));
}

export function Pagination({ page, pageCount, hrefFor, link: Link = DefaultLink }: PaginationProps) {
  if (pageCount <= 1) return null;
  const linkClass =
    "inline-flex size-11 items-center justify-center rounded-full text-sm font-medium tabular-nums transition-colors duration-150 hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none sm:size-10";
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={linkClass} aria-label="Previous page">
          <ChevronLeft className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(linkClass, "opacity-40")} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}
      {pageList(page, pageCount).map((p, i) =>
        p === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground" aria-hidden>
            …
          </span>
        ) : (
          <Link
            key={p}
            href={hrefFor(p)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
            className={cn(linkClass, p === page && "bg-primary text-primary-foreground hover:bg-primary")}
          >
            {p}
          </Link>
        ),
      )}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={linkClass} aria-label="Next page">
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : (
        <span className={cn(linkClass, "opacity-40")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
