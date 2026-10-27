import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label={`${siteConfig.fullName}, home`}>
      <Image
        src="/brand/logo.png"
        alt=""
        width={44}
        height={44}
        priority
        className="size-11 shrink-0 rounded-full bg-white"
      />
      {!compact && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-base font-semibold tracking-tight">{siteConfig.name}</span>
          <span className="truncate text-[0.7rem] font-semibold tracking-[0.18em] text-brand uppercase">
            {siteConfig.branch}
          </span>
        </span>
      )}
    </Link>
  );
}
