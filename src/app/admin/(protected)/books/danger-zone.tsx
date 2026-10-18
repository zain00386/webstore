"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deleteBook } from "./actions";

/** Permanent delete, behind a dialog that requires typing DELETE. Hiding is usually the better choice. */
export function DangerZone({ id, title }: { id: string; title: string }) {
  const [state, action, pending] = useActionState(deleteBook, {});
  const [typed, setTyped] = useState("");

  return (
    <section className="space-y-3 rounded-2xl p-5 ring-1 ring-destructive/30">
      <h2 className="font-semibold text-destructive">Delete this book</h2>
      <p className="text-sm text-muted-foreground">
        Usually it&apos;s better to untick <strong>On sale in the shop</strong> to hide a book; you can show it again
        any time. Deleting can&apos;t be undone. Past orders keep their own copy of the title and price.
      </p>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="destructive">
            <Trash2 aria-hidden /> Delete permanently…
          </Button>
        </DialogTrigger>
        <DialogContent>
          <form action={action} className="space-y-4">
            <input type="hidden" name="id" value={id} />
            <DialogHeader>
              <DialogTitle>Delete “{title}”?</DialogTitle>
              <DialogDescription>
                This removes the book and its cover from the shop permanently. Type <strong>DELETE</strong> to confirm.
              </DialogDescription>
            </DialogHeader>
            {state.error && <Alert tone="error">{state.error}</Alert>}
            <label className="sr-only" htmlFor="confirm-delete">
              Type DELETE to confirm
            </label>
            <Input id="confirm-delete" name="confirm" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            <DialogFooter>
              <Button type="submit" variant="destructive" disabled={typed !== "DELETE" || pending}>
                {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
                Delete permanently
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
