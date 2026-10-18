import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type ChoiceCardProps = {
  name: string;
  value: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
  title: ReactNode;
  description?: ReactNode;
  aside?: ReactNode;
};

/** Large selectable radio card. The native radio keeps keyboard and screen-reader behaviour. */
export function ChoiceCard({ name, value, checked, disabled, onChange, title, description, aside }: ChoiceCardProps) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-border transition has-focus-visible:ring-2 has-focus-visible:ring-ring",
        checked && "ring-2 ring-primary",
        disabled && "cursor-not-allowed opacity-55",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onChange(value)}
        className="mt-1 size-4 accent-[var(--primary)]"
      />
      <span className="flex-1">
        <span className="block text-sm font-semibold">{title}</span>
        {description && <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>}
      </span>
      {aside && <span className="text-sm font-semibold">{aside}</span>}
    </label>
  );
}
