import Link from "next/link";
import { BookOpenText } from "lucide-react";
import { siteConfig } from "@/config/site";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label={`${siteConfig.fullName}, home`}>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <BookOpenText className="size-5" aria-hidden />
      </span>
      {!compact && (
        <span className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight">{siteConfig.name}</span>
          <span className="text-[0.7rem] font-semibold tracking-[0.18em] text-brand uppercase">
            {siteConfig.branch}
          </span>
        </span>
      )}
    </Link>
  );
}
