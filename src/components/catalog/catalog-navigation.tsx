"use client";

import { createContext, useCallback, useContext, useTransition, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type CatalogNavigationValue = {
  /** True while the next set of results is loading. */
  pending: boolean;
  navigate: (href: string) => void;
};

const CatalogNavigationContext = createContext<CatalogNavigationValue | null>(null);

/**
 * Filter, sort and chip changes navigate inside one transition, so the current
 * results stay on screen (dimmed) until the new ones are ready.
 */
export function CatalogNavigation({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = useCallback((href: string) => startTransition(() => router.push(href)), [router]);
  return <CatalogNavigationContext value={{ pending, navigate }}>{children}</CatalogNavigationContext>;
}

/** Falls back to plain navigation outside <CatalogNavigation>. */
export function useCatalogNavigation(): CatalogNavigationValue {
  const router = useRouter();
  return useContext(CatalogNavigationContext) ?? { pending: false, navigate: (href) => router.push(href) };
}

/** The results area: dimmed and marked busy while new results load. */
export function CatalogResults({ children, className, ...props }: ComponentProps<"section">) {
  const { pending } = useCatalogNavigation();
  return (
    <section
      {...props}
      aria-busy={pending || undefined}
      className={cn("min-w-0 transition-opacity duration-200 ease-out", pending && "pointer-events-none opacity-60", className)}
    >
      {children}
    </section>
  );
}

/** A link that changes the results (filter chip, "Clear all") with the same pending feedback. */
export function CatalogLink({ href, onClick, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { navigate } = useCatalogNavigation();
  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        // Let the browser handle new-tab / modified clicks.
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(href);
      }}
      {...props}
    />
  );
}

/** The URL a GET form would go to, without empty fields (e.g. "All exams", a blank price). */
export function formHref(form: HTMLFormElement): string {
  const params = new URLSearchParams();
  for (const [key, value] of new FormData(form)) {
    if (typeof value === "string" && value.trim() !== "") params.append(key, value.trim());
  }
  const qs = params.toString();
  const action = new URL(form.action, window.location.href).pathname;
  return qs ? `${action}?${qs}` : action;
}
