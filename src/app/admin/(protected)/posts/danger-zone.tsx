"use client";

import { useActionState, useState } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { deletePost } from "./actions";

/** Permanent delete, behind a dialog that requires typing DELETE. Archiving is usually the better choice. */
export function PostDangerZone({ id, title }: { id: string; title: string }) {
  const [state, action, pending] = useActionState(deletePost, {});
  const [typed, setTyped] = useState("");

  return (
    <section className="space-y-3 rounded-2xl p-5 ring-1 ring-destructive/30">
      <h2 className="font-semibold text-destructive">Delete this post</h2>
      <p className="text-sm text-muted-foreground">
        To take a post off the site but keep it, set its status to <strong>Archived</strong> instead. Deleting
        can&apos;t be undone.
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
                This removes the post and its image permanently. Type <strong>DELETE</strong> to confirm.
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
