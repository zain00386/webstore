"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActive, mainNav } from "./nav-items";

/** Phone-only bottom tab bar. */
export function MobileTabBar() {
  const pathname = usePathname();
  return <MobileTabBarList pathname={pathname} />;
}

export function MobileTabBarList({ pathname }: { pathname: string | null }) {
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {mainNav.map(({ label, href, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 text-[0.7rem] font-medium text-muted-foreground",
                  active && "text-brand",
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
