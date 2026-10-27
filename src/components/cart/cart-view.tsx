"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, ShoppingBag, Trash2 } from "lucide-react";
import { MAX_PER_LINE, purchasableLines } from "@/lib/cart/cart";
import { hasBlockingLines } from "@/lib/cart/reconcile";
import { cn } from "@/lib/utils";
import { formatPKR } from "@/lib/format";
import { Price } from "@/components/book/price";
import { QuantityStepper } from "@/components/book/quantity-stepper";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { CartNotices } from "./cart-notices";
import { useCart } from "./cart-provider";
import { useCartCheck } from "./use-cart-check";

/** cheapestDelivery: lowest switched-on delivery fee from settings (null = none). */
export function CartView({ cheapestDelivery }: { cheapestDelivery: number | null }) {
  const { lines, ready, subtotal, setQuantity, remove } = useCart();
  const check = useCartCheck(ready);
  const blocking = hasBlockingLines(lines);
  const count = purchasableLines(lines).reduce((n, l) => n + l.quantity, 0);
  const canCheckout = !blocking && check.status === "ok";

  if (!ready) {
    return (
      <div className="space-y-3" role="status">
        <span className="sr-only">Loading your cart…</span>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your cart is empty"
        description="Find books for your exam and add them here."
        action={
          <Button asChild size="pill">
            <Link href="/books">Browse books</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <CartNotices check={check} blocking={blocking} />
        <ul className="space-y-3" aria-label="Books in your cart">
          {lines.map((line) => (
            <li
              key={line.slug}
              className={cn(
                "flex gap-4 rounded-2xl bg-card p-3 ring-1 ring-border sm:p-4",
                line.status && "ring-2 ring-brand/40",
              )}
            >
              <Link
                href={`/books/${line.slug}`}
                className="relative aspect-[2/3] w-20 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-24"
                tabIndex={-1}
                aria-hidden
              >
                {line.coverUrl ? (
                  <Image
                    src={line.coverUrl}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-contain p-1"
                  />
                ) : (
                  <BookOpen className="m-auto mt-8 size-6 text-muted-foreground" />
                )}
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link
                      href={`/books/${line.slug}`}
                      className="line-clamp-2 text-sm font-semibold hover:underline"
                    >
                      {line.title}
                    </Link>
                    {line.publisher && (
                      <p className="text-xs text-muted-foreground">
                        {line.publisher}
                      </p>
                    )}
                    {line.status && (
                      <p className="mt-1 text-xs font-semibold text-brand">
                        {line.status === "out_of_stock"
                          ? "Out of stock"
                          : "No longer available"}
                        : remove to continue
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(line.slug)}
                    aria-label={`Remove ${line.title} from cart`}
                  >
                    <Trash2 aria-hidden />
                  </Button>
                </div>
                <Price price={line.price} compareAt={line.compareAtPrice} />
                {line.status ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-auto w-fit"
                    onClick={() => remove(line.slug)}
                  >
                    <Trash2 aria-hidden /> Remove from cart
                  </Button>
                ) : (
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2">
                    <QuantityStepper
                      label={`Quantity of ${line.title}`}
                      value={line.quantity}
                      onChange={(q) => setQuantity(line.slug, q)}
                      max={Math.min(line.maxQuantity, MAX_PER_LINE)}
                    />
                    <p className="shrink-0 text-sm font-semibold whitespace-nowrap tabular-nums">
                      {formatPKR(line.price * line.quantity)}
                    </p>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside
        aria-labelledby="summary-title"
        className="h-fit rounded-2xl bg-surface p-5 ring-1 ring-border lg:sticky lg:top-24"
      >
        <h2 id="summary-title" className="mb-4 text-lg font-semibold">
          Order summary
        </h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt>
              Subtotal ({count} {count === 1 ? "book" : "books"})
            </dt>
            <dd className="font-semibold whitespace-nowrap tabular-nums">{formatPKR(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Delivery</dt>
            <dd>{cheapestDelivery === null ? "chosen at checkout" : `from ${formatPKR(cheapestDelivery)}, chosen at checkout`}</dd>
          </div>
        </dl>
        {canCheckout ? (
          <Button asChild size="pill" className="mt-5 w-full">
            <Link href="/checkout">
              Proceed to checkout{" "}
              <ArrowRight data-icon="inline-end" aria-hidden />
            </Link>
          </Button>
        ) : (
          <Button size="pill" className="mt-5 w-full" disabled>
            {check.status === "checking" && <Spinner />}
            {check.status === "checking"
              ? "Checking your cart…"
              : blocking
                ? "Remove unavailable books first"
                : "Proceed to checkout"}
          </Button>
        )}
        <Link
          href="/books"
          className="mt-3 block text-center text-sm font-medium hover:underline"
        >
          Continue shopping
        </Link>
        <p className="mt-4 text-xs text-muted-foreground">
          Prices and stock are checked with our shop now, and again when you
          place your order. Adding to the cart doesn’t reserve a copy.
        </p>
      </aside>
    </div>
  );
}
