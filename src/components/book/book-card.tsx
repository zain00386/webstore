import type { ReactNode } from "react";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { getStockStatus } from "@/lib/stock";
import { cn } from "@/lib/utils";
import type { BookSummary } from "@/types/book";
import { Price } from "./price";
import { StockBadge } from "./stock-badge";

type BookCardProps = {
  book: BookSummary;
  lowStockThreshold?: number | null;
  /** The buy button area. Passed in so the card stays independent of cart logic. */
  action?: ReactNode;
};

export function BookCard({ book, lowStockThreshold, action }: BookCardProps) {
  const status = getStockStatus(book.stockQuantity, lowStockThreshold);
  const soldOut = status === "out_of_stock";
  const byline = [book.author, book.publisher].filter(Boolean).join(" · ");

  return (
    <article className="flex h-full flex-col rounded-2xl bg-card p-3 shadow-[0_1px_3px_rgb(0_0_0/0.06)] ring-1 ring-border">
      <div className="relative mb-3 aspect-[2/3] overflow-hidden rounded-xl bg-muted">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt={`Cover of ${book.title}`}
            fill
            sizes="(min-width: 1024px) 220px, (min-width: 640px) 30vw, 45vw"
            className={cn("object-contain p-2 drop-shadow-md", soldOut && "opacity-50 grayscale-[40%]")}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <BookOpen className="size-10" aria-hidden />
            <span className="sr-only">No cover image</span>
          </div>
        )}
        <StockBadge status={status} className="absolute top-2 left-2" />
      </div>
      <h3 className="line-clamp-2 text-sm leading-snug font-semibold" title={book.title}>
        {book.title}
      </h3>
      {byline && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{byline}</p>}
      <Price price={book.price} compareAt={book.compareAtPrice} className="mt-2" />
      {action && <div className="mt-auto pt-3">{action}</div>}
    </article>
  );
}
