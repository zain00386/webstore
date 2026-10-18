"use client";

import { cloneElement, useId, type ReactElement } from "react";
import { Label } from "@/components/ui/label";

type FormFieldProps = {
  label: string;
  /** A single input/textarea/select element; id and aria wiring are added automatically. */
  children: ReactElement<Record<string, unknown>>;
  hint?: string;
  error?: string;
  required?: boolean;
};

/** Label + control + hint + error, correctly linked for screen readers. */
export function FormField({ label, children, hint, error, required }: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? (
          <span className="text-brand" aria-hidden>
            *
          </span>
        ) : (
          <span className="font-normal text-muted-foreground">(optional)</span>
        )}
      </Label>
      {cloneElement(children, {
        id,
        required,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {hint && (
        <p id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
