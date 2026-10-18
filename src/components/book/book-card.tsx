import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
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
  /** Set on the first few cards above the fold. */
  priority?: boolean;
};

export function BookCard({ book, lowStockThreshold, action, priority }: BookCardProps) {
  const status = getStockStatus(book.stockQuantity, lowStockThreshold);
  const soldOut = status === "out_of_stock";
  const byline = [book.author, book.publisher].filter(Boolean).join(" · ");
  const href = `/books/${book.slug}`;

  return (
    <article className="group relative flex h-full flex-col rounded-2xl bg-card p-3 shadow-[0_1px_3px_rgb(0_0_0/0.06)] ring-1 ring-border transition-shadow hover:shadow-md">
      <div className="relative mb-3 aspect-[2/3] overflow-hidden rounded-xl bg-muted">
        {book.coverUrl ? (
          <Image
            src={book.coverUrl}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1280px) 220px, (min-width: 1024px) 20vw, (min-width: 640px) 30vw, 45vw"
            className={cn(
              "object-contain p-2 drop-shadow-md transition-transform group-hover:scale-[1.03]",
              soldOut && "opacity-50 grayscale-[40%]",
            )}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <BookOpen className="size-10" aria-hidden />
          </div>
        )}
        <StockBadge status={status} className="absolute top-2 left-2" />
      </div>
      <h3 className="line-clamp-2 text-sm leading-snug font-semibold" title={book.title}>
        {/* The whole card is clickable via this link's ::after overlay. */}
        <Link href={href} className="after:absolute after:inset-0 after:rounded-2xl focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring">
          {book.title}
        </Link>
      </h3>
      {byline && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{byline}</p>}
      <Price price={book.price} compareAt={book.compareAtPrice} className="mt-2" />
      {/* relative + z-10 keeps the button clickable above the card link overlay */}
      {action && <div className="relative z-10 mt-auto pt-3">{action}</div>}
    </article>
  );
}
