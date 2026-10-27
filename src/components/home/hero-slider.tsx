"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Pause, Phone, Play } from "lucide-react";
import type { HeroSlide } from "@/lib/home/hero-slides";
import { formatPKR, whatsappLink } from "@/lib/format";
import { CoverImage } from "@/components/book/cover-image";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const INTERVAL_MS = 6000;

/** True when the visitor asked their device for less motion: then slides never move by themselves. */
function useReducedMotion() {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true,
  );
}

type Props = {
  slides: HeroSlide[];
  phones: string[];
  whatsappDisplay: string;
  phoneE164: string;
};

/**
 * Home page banner: latest vacancies with their books, new arrivals and popular exams.
 * Accessible carousel: buttons and dots to move, a pause button, pauses while
 * hovered or focused, and no automatic movement for reduced-motion users.
 */
export function HeroSlider({
  slides,
  phones,
  whatsappDisplay,
  phoneE164,
}: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const reducedMotion = useReducedMotion();
  const count = slides.length;
  const go = useCallback(
    (n: number) => setIndex(((n % count) + count) % count),
    [count],
  );
  const autoplay = count > 1 && !paused && !hovering && !reducedMotion;

  useEffect(() => {
    if (!autoplay) return;
    const t = setTimeout(() => go(index + 1), INTERVAL_MS);
    return () => clearTimeout(t);
  }, [autoplay, index, go]);

  if (!count) return null;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="New test books"
      className="overflow-hidden rounded-3xl bg-surface ring-1 ring-border"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setHovering(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHovering(false);
      }}
    >
      {/* All slides share one grid cell, so the tallest sets the height and autoplay never shifts the page. */}
      <div className="grid">
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}: ${slide.title}`}
            aria-hidden={i !== index || undefined}
            inert={i !== index}
            className={cn("grid items-center gap-6 p-6 [grid-area:1/1] sm:p-10 lg:grid-cols-[1.3fr_1fr]", i !== index && "invisible")}
          >
            <div className="space-y-4">
              <span className="inline-flex rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold tracking-wide text-brand uppercase">
                New test book
              </span>
              <h2 className="text-3xl leading-tight font-bold tracking-tight text-balance sm:text-4xl">
                <Link href={`/books/${slide.slug}`} className="hover:underline">
                  {slide.title}
                </Link>
              </h2>
              {(slide.publisher || slide.edition) && (
                <p className="text-muted-foreground">
                  {[slide.publisher, slide.edition].filter(Boolean).join(" · ")}
                </p>
              )}
              <p className="flex flex-wrap items-baseline gap-2">
                <span className="text-2xl font-semibold tabular-nums">
                  {formatPKR(slide.price)}
                </span>
                {slide.compareAtPrice && slide.compareAtPrice > slide.price && (
                  <span className="text-muted-foreground tabular-nums line-through">
                    {formatPKR(slide.compareAtPrice)}
                  </span>
                )}
                {!slide.inStock && (
                  <span className="text-sm font-medium text-brand">
                    Out of stock
                  </span>
                )}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="pill">
                  <Link href={`/books/${slide.slug}`}>
                    {slide.inStock ? "Buy now" : "View book"}
                  </Link>
                </Button>
                <Button asChild size="pill" variant="outline">
                  <Link href="/books?sort=newest">All new books</Link>
                </Button>
              </div>
              <p className="flex w-fit flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-card px-4 py-2 text-sm font-semibold ring-1 ring-border sm:rounded-full">
                <span className="uppercase">To order, call or WhatsApp</span>
                <span className="flex flex-wrap items-center gap-x-3">
                  <Phone className="size-4 text-brand" aria-hidden />
                  {phones.map((p) => (
                    <a
                      key={p}
                      href={`tel:${p.replace(/[^\d+]/g, "")}`}
                      className="-my-2.5 inline-flex min-h-11 items-center tabular-nums hover:underline"
                    >
                      {p}
                    </a>
                  ))}
                  <a
                    href={whatsappLink(phoneE164)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="-my-2.5 inline-flex min-h-11 items-center gap-1 text-whatsapp tabular-nums hover:underline"
                  >
                    <WhatsAppIcon className="size-4" /> {whatsappDisplay}
                  </a>
                </span>
              </p>
            </div>
            <div className="flex justify-center" aria-hidden>
              <div className="relative aspect-[2/3] w-44 -rotate-2 overflow-hidden rounded-xl bg-card shadow-xl ring-1 ring-border sm:w-56">
                <CoverImage
                  src={slide.coverUrl}
                  alt=""
                  fill
                  sizes="224px"
                  className="object-cover"
                  priority={i === 0}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="flex items-center justify-center gap-2 border-t border-border bg-card/60 px-4 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
          >
            <ChevronLeft aria-hidden />
          </Button>
          {/* Phones: a short "1 / 8" counter; wider screens: one dot per book. */}
          <span className="min-w-12 text-center text-sm font-medium tabular-nums sm:hidden" aria-live="polite">
            {index + 1} / {count}
          </span>
          <div className="hidden items-center sm:flex">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show slide ${i + 1}: ${s.title}`}
                aria-current={i === index ? "true" : undefined}
                className="flex size-10 items-center justify-center rounded-full transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    "size-2.5 rounded-full ring-1 ring-foreground/40",
                    i === index && "bg-foreground ring-foreground",
                  )}
                />
              </button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
          >
            <ChevronRight aria-hidden />
          </Button>
          {!reducedMotion && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setPaused((p) => !p)}
              aria-label={paused ? "Play slides" : "Pause slides"}
            >
              {paused ? <Play aria-hidden /> : <Pause aria-hidden />}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
