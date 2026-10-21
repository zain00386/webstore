"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookCopy, FolderTree, GalleryHorizontal, LayoutDashboard, Newspaper, Settings, ShoppingCart, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const items: { label: string; href: string; icon: LucideIcon }[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Books", href: "/admin/books", icon: BookCopy },
  { label: "Categories", href: "/admin/categories", icon: FolderTree },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  { label: "Posts", href: "/admin/posts", icon: Newspaper },
  { label: "Banner", href: "/admin/banner", icon: GalleryHorizontal },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

function active(pathname: string | null, href: string) {
  if (!pathname) return false;
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminNav() {
  return <AdminNavList pathname={usePathname()} />;
}

/** Also used as the Suspense fallback, with nothing highlighted. */
export function AdminNavList({ pathname }: { pathname: string | null }) {
  return (
    <nav aria-label="Admin">
      <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
        {items.map(({ label, href, icon: Icon }) => {
          const isActive = active(pathname, href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                  isActive && "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
