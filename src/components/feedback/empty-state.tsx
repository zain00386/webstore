import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { BookOpen } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon: Icon = BookOpen, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-card px-6 py-14 text-center ring-1 ring-border">
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
