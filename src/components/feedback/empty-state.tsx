import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  /** Use 1 when the empty state IS the page (not found pages). */
  headingLevel?: 1 | 2;
};

export function EmptyState({
  title,
  description,
  icon: Icon = BookOpen,
  action,
  headingLevel = 2,
}: EmptyStateProps) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  return (
    <div className="flex flex-col items-center rounded-2xl bg-card px-6 py-14 text-center ring-1 ring-border">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" aria-hidden />
      </span>
      <Heading className="text-lg font-semibold">{title}</Heading>
      {description && (
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
