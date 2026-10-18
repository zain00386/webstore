import type { ReactNode } from "react";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  id?: string;
};

export function SectionHeading({ eyebrow, title, description, action, id }: SectionHeadingProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && (
          <p className="mb-1 text-xs font-semibold tracking-[0.14em] text-brand uppercase">{eyebrow}</p>
        )}
        <h2 id={id} className="text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
