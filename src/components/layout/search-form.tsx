import Form from "next/form";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** GET form to /books?q=... — works without JavaScript too. */
export function SearchForm({ className, id = "site-search" }: { className?: string; id?: string }) {
  return (
    <Form action="/books" role="search" className={cn("relative w-full", className)}>
      <label htmlFor={id} className="sr-only">
        Search books, authors or exams
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        id={id}
        name="q"
        type="search"
        placeholder="Search books, authors or exams"
        className="h-11 w-full rounded-full border border-input bg-surface pr-4 pl-11 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30"
      />
    </Form>
  );
}
