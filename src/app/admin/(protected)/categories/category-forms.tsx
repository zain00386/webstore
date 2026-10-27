"use client";

import { useActionState, useEffect } from "react";
import { Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminField } from "@/components/admin/field-styles";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createCategory, deleteCategory, updateCategory, type CategoryState } from "./actions";

const input = `${adminField} h-11 px-2 sm:h-9`;

function useToast(state: CategoryState) {
  useEffect(() => {
    if (state.ok) toast.success(state.ok);
    else if (state.error) toast.error(state.error);
  }, [state]);
}

export function NewCategoryForm() {
  const [state, action, pending] = useActionState(createCategory, {});
  useToast(state);
  return (
    <form key={state.ok ? state.attempt : "new"} action={action} className="flex flex-wrap items-end gap-2 rounded-2xl bg-surface p-4 ring-1 ring-border">
      <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium">
        New category name
        <input name="name" required maxLength={80} className={input} aria-invalid={Boolean(state.fieldErrors?.name) || undefined} />
        {state.fieldErrors?.name && <span className="text-destructive">{state.fieldErrors.name}</span>}
      </label>
      <label className="flex w-48 flex-col gap-1 text-xs font-medium">
        Web address (optional)
        <input name="slug" maxLength={80} placeholder="made from the name" className={input} aria-invalid={Boolean(state.fieldErrors?.slug) || undefined} />
        {state.fieldErrors?.slug && <span className="text-destructive">{state.fieldErrors.slug}</span>}
      </label>
      <label className="flex w-24 flex-col gap-1 text-xs font-medium">
        Order
        <input name="sortOrder" defaultValue="500" inputMode="numeric" className={input} />
      </label>
      <SubmitButton pending={pending} pendingLabel="Adding…" icon={<Plus aria-hidden />}>
        Add
      </SubmitButton>
    </form>
  );
}

export function CategoryRow({
  category,
  bookCount,
  isFallback,
}: {
  category: { id: string; name: string; slug: string; sort_order: number; is_active: boolean };
  bookCount: number;
  isFallback: boolean;
}) {
  const [state, action, pending] = useActionState(updateCategory, {});
  const [delState, delAction, deleting] = useActionState(deleteCategory, {});
  useToast(state);
  useToast(delState);

  return (
    <tr>
      <td className="p-3" colSpan={4}>
        <form action={action} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={category.id} />
          <label className="flex min-w-48 flex-1 flex-col text-xs text-muted-foreground">
            <span className="sr-only">Name</span>
            <input name="name" defaultValue={category.name} maxLength={80} className={`${input} text-foreground`} />
            <span className="mt-0.5">/books?category={category.slug} · {bookCount} book{bookCount === 1 ? "" : "s"}</span>
          </label>
          <label className="flex items-center gap-1 text-xs">
            Order
            <input name="sortOrder" defaultValue={category.sort_order} inputMode="numeric" className={`${input} w-20`} />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" name="isActive" defaultChecked={category.is_active} className="size-4 accent-[var(--primary)]" />
            Shown in shop
          </label>
          <SubmitButton variant="outline" pending={pending} pendingLabel="Saving…" icon={<Save aria-hidden />}>
            Save
          </SubmitButton>
          {!isFallback && (
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="ghost" aria-label={`Delete ${category.name}`}>
                  <Trash2 aria-hidden />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form action={delAction} className="space-y-4">
                  <input type="hidden" name="id" value={category.id} />
                  <input type="hidden" name="confirm" value="yes" />
                  <DialogHeader>
                    <DialogTitle>Delete “{category.name}”?</DialogTitle>
                    <DialogDescription>
                      {bookCount > 0
                        ? `Its ${bookCount} book${bookCount === 1 ? "" : "s"} will move to “Other books”. No book is deleted.`
                        : "This category has no books."}{" "}
                      Links to this category will stop working.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <SubmitButton variant="destructive" pending={deleting} pendingLabel="Deleting…" icon={<Trash2 aria-hidden />}>
                      Delete category
                    </SubmitButton>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </form>
      </td>
    </tr>
  );
}
