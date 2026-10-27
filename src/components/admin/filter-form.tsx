"use client";

import { createContext, use, useTransition, type ComponentProps, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubmitButton } from "@/components/forms/submit-button";
import { cn } from "@/lib/utils";

type FilterState = { pending: boolean; navigate: (href: string) => void };

// Outside <FilterScope>: plain navigation, no pending state.
const FilterContext = createContext<FilterState>({ pending: false, navigate: (href) => window.location.assign(href) });

/**
 * Wraps a list page's search form and its results, so a new search keeps the old
 * results on screen (dimmed, aria-busy) and shows "Searching…" until the new ones arrive.
 */
export function FilterScope({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const navigate = (href: string) => startTransition(() => router.push(href));
  return <FilterContext value={{ pending, navigate }}>{children}</FilterContext>;
}

/** A GET search form. Works without JavaScript; with it, navigates inside a transition. */
export function FilterForm({ action, className, children }: { action: string; className?: string; children: ReactNode }) {
  const { navigate } = use(FilterContext);
  return (
    <form
      role="search"
      action={action}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const qs = new URLSearchParams();
        for (const [k, v] of new FormData(e.currentTarget)) if (typeof v === "string") qs.append(k, v);
        const s = qs.toString();
        navigate(s ? `${action}?${s}` : action);
      }}
    >
      {children}
    </form>
  );
}

export function FilterSubmit({ children, ...props }: Omit<ComponentProps<typeof SubmitButton>, "pending" | "pendingLabel">) {
  const { pending } = use(FilterContext);
  return (
    <SubmitButton pending={pending} pendingLabel="Searching…" {...props}>
      {children}
    </SubmitButton>
  );
}

/** A link that changes the results (view tab, "Clear") with the same pending feedback. */
export function FilterLink({ href, onClick, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { navigate } = use(FilterContext);
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

/** The results area: dimmed and marked busy while a new search loads. */
export function FilterResults({ className, children }: { className?: string; children: ReactNode }) {
  const { pending } = use(FilterContext);
  return (
    <div
      aria-busy={pending || undefined}
      className={cn("transition-opacity duration-200 ease-out motion-reduce:transition-none", pending && "pointer-events-none opacity-60", className)}
    >
      {children}
    </div>
  );
}
