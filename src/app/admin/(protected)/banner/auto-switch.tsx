"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { saveBannerAuto } from "./actions";

/** "Also show new vacancy posts in the banner" switch. */
export function AutoVacanciesSwitch({ on }: { on: boolean }) {
  const [state, action, pending] = useActionState(saveBannerAuto, {});
  useEffect(() => {
    if (state.ok) toast.success(state.ok);
    else if (state.error) toast.error(state.error);
  }, [state]);
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <label className="flex min-h-10 flex-1 items-start gap-2 text-sm">
        <input type="checkbox" name="autoVacancies" defaultChecked={on} className="mt-0.5 size-5 accent-[var(--primary)]" />
        <span>
          <span className="font-medium">Also add a slide for each new vacancy post</span>
          <span className="block text-xs text-muted-foreground">
            Shown after your own slides, with the books for that exam (only for vacancies linked to an exam).
          </span>
        </span>
      </label>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />} Save
      </Button>
    </form>
  );
}
