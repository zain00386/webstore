"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { BookOpen } from "lucide-react";

/** next/image with a tidy placeholder if the picture is missing or fails to load. */
export function CoverImage({ src, alt, ...props }: Omit<ImageProps, "src"> & { src: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <span className="flex h-full w-full items-center justify-center text-muted-foreground">
        <BookOpen className="size-1/4 max-h-16 max-w-16" aria-hidden />
        <span className="sr-only">{alt || "No cover image"}</span>
      </span>
    );
  }
  return <Image src={src} alt={alt} onError={() => setFailed(true)} {...props} />;
}
