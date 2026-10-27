"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type SubmitButtonProps = Omit<ComponentProps<typeof Button>, "type"> & {
  /** Label shown while the form is submitting, e.g. "Saving…". */
  pendingLabel: ReactNode;
  /** Icon shown when idle; swapped for the spinner while pending. */
  icon?: ReactNode;
  /** Force the pending look (e.g. from useActionState / useTransition). Defaults to the parent form's status. */
  pending?: boolean;
};

/** Submit button that disables itself and shows a spinner while its form is submitting. */
export function SubmitButton({ pendingLabel, icon, pending, disabled, children, ...props }: SubmitButtonProps) {
  const status = useFormStatus();
  const busy = pending ?? status.pending;
  return (
    <Button type="submit" disabled={disabled || busy} aria-busy={busy || undefined} {...props}>
      {busy ? <Spinner /> : icon}
      {busy ? pendingLabel : children}
    </Button>
  );
}
