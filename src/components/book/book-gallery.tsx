"use client";

import { useState } from "react";
import Image from "next/image";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

/** Main cover plus clickable thumbnails ("look inside" / back cover) when a book has more than one photo. */
export function BookGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const current = images[active];

  return (
    <div className="space-y-3">
      <div className="relative aspect-[3/4] overflow-hidden rounded-3xl bg-surface ring-1 ring-border">
        {current ? (
          <Image
            key={current}
            src={current}
            alt={images.length > 1 ? `${title}, photo ${active + 1} of ${images.length}` : `Cover of ${title}`}
            fill
            priority={active === 0}
            sizes="(min-width: 1024px) 420px, 100vw"
            className="object-contain p-6 drop-shadow-xl"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <BookOpen className="size-16" aria-hidden />
            <span className="sr-only">No cover image</span>
          </div>
        )}
      </div>
      {images.length > 1 && (
        <ul className="flex gap-2" aria-label="Book photos">
          {images.map((src, i) => (
            <li key={src}>
              <button
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Show photo ${i + 1} of ${images.length}`}
                aria-pressed={i === active}
                className={cn(
                  "relative block size-20 overflow-hidden rounded-xl bg-surface ring-1 ring-border",
                  i === active && "ring-2 ring-primary",
                )}
              >
                <Image src={src} alt="" fill sizes="80px" className="object-contain p-1" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
