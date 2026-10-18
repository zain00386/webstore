"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActive, mainNav } from "./nav-items";

/** Desktop-only slim icon sidebar (like the reference design). */
export function SideNav() {
  const pathname = usePathname();
  return <SideNavList pathname={pathname} />;
}

/** Rendered as the Suspense fallback too, with nothing highlighted. */
export function SideNavList({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Main" className="flex flex-col items-center gap-2">
      {mainNav.map(({ label, href, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex w-16 flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[0.7rem] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-brand text-brand-foreground hover:bg-brand hover:text-brand-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
