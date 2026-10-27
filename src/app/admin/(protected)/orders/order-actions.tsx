"use client";

import { useActionState, useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { adminField } from "@/components/admin/field-styles";
import { Alert } from "@/components/feedback/alert";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { actionLabels, couriers, type OrderAction } from "@/lib/orders/admin-actions";
import { formatPKR } from "@/lib/format";
import { updateOrder, type OrderActionState } from "./actions";

const field = `${adminField} h-10 w-full px-3`;

type Props = {
  orderId: string;
  orderNumber: string;
  updatedAt: string;
  actions: OrderAction[];
  paymentLabel: string;
  isPrepaid: boolean;
  isPaid: boolean;
  total: number;
  defaultCourier: (typeof couriers)[number];
  shipBlockedReason: string | null;
};

/** Simple steps run with one click; anything risky opens a dialog first. */
const oneClick: ReadonlySet<OrderAction> = new Set(["confirm", "pack", "deliver"]);

export function OrderActions(p: Props) {
  const [state, action, pending] = useActionState<OrderActionState, FormData>(updateOrder, {});
  const [open, setOpen] = useState<OrderAction | null>(null);

  useEffect(() => {
    if (state.ok) {
      toast.success(state.ok);
      setOpen(null); // eslint-disable-line react-hooks/set-state-in-effect -- close the dialog after a successful save
    } else if (state.error) toast.error(state.error);
  }, [state]);

  const hidden = (a: OrderAction) => (
    <>
      <input type="hidden" name="orderId" value={p.orderId} />
      <input type="hidden" name="expectedUpdatedAt" value={p.updatedAt} />
      <input type="hidden" name="action" value={a} />
    </>
  );
  const main = p.actions.filter((a) => a !== "note");

  return (
    <div className="space-y-3">
      {state.error && !open && <Alert tone="error">{state.error}</Alert>}
      {p.shipBlockedReason && !p.actions.includes("ship") && p.actions.includes("mark_paid") && (
        <p className="text-sm text-muted-foreground">{p.shipBlockedReason}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {main.map((a) =>
          oneClick.has(a) ? (
            <form key={a} action={action}>
              {hidden(a)}
              {/* Each form spins only its own button; `pending` disables the rest while any save runs. */}
              <SubmitButton disabled={pending} pendingLabel="Saving…">
                {actionLabels[a]}
              </SubmitButton>
            </form>
          ) : (
            <Button
              key={a}
              type="button"
              variant={a === "cancel" || a === "payment_failed" ? "outline" : a === "mark_paid" || a === "ship" ? "default" : "secondary"}
              className={a === "cancel" ? "text-destructive" : undefined}
              onClick={() => setOpen(a)}
              disabled={pending}
            >
              {actionLabels[a]}…
            </Button>
          ),
        )}
      </div>

      <ConfirmDialog
        open={open === "mark_paid"}
        onClose={() => setOpen(null)}
        title={`Mark ${p.orderNumber} as paid?`}
        description={
          p.isPrepaid
            ? `Only do this after you have seen ${formatPKR(p.total)} arrive in your ${p.paymentLabel} account. A customer's screenshot alone is not enough.`
            : `Do this once the courier has paid you the ${formatPKR(p.total)} cash for this order.`
        }
      >
        <form action={action} className="space-y-4">
          {hidden("mark_paid")}
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" required className="mt-0.5 size-5 accent-[var(--primary)]" />
            {p.isPrepaid ? `I checked: ${formatPKR(p.total)} is in our ${p.paymentLabel} account.` : `I have received the ${formatPKR(p.total)} cash.`}
          </label>
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <DialogFooter>
            <SubmitButton pending={pending} pendingLabel="Saving…">
              Mark paid
            </SubmitButton>
          </DialogFooter>
        </form>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === "payment_failed"}
        onClose={() => setOpen(null)}
        title="Payment not received?"
        description="The order stays open and the customer's page shows “Payment not received”. You can still mark it paid later, or cancel it."
      >
        <form action={action} className="space-y-4">
          {hidden("payment_failed")}
          <NoteField label="Note (optional)" />
          {state.error && <Alert tone="error">{state.error}</Alert>}
          <DialogFooter>
            <SubmitButton variant="outline" pending={pending} pendingLabel="Saving…">
              Payment not received
            </SubmitButton>
          </DialogFooter>
        </form>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === "ship"}
        onClose={() => setOpen(null)}
        title={`Ship ${p.orderNumber}`}
        description="The customer sees the courier and tracking number on their order page."
      >
        <form action={action} className="space-y-4">
          {hidden("ship")}
          <label className="block space-y-1 text-sm font-medium">
            Sent with
            <select name="shippedVia" defaultValue={p.defaultCourier} className={field}>
              {couriers.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm font-medium">
            Tracking number <span className="font-normal text-muted-foreground">(optional)</span>
            <input name="trackingNumber" maxLength={40} autoComplete="off" className={field} aria-invalid={Boolean(state.fieldErrors?.trackingNumber) || undefined} />
            {state.fieldErrors?.trackingNumber && <span className="text-xs text-destructive">{state.fieldErrors.trackingNumber}</span>}
          </label>
          {state.error && !state.fieldErrors?.trackingNumber && <Alert tone="error">{state.error}</Alert>}
          <DialogFooter>
            <SubmitButton pending={pending} pendingLabel="Saving…">
              Mark shipped
            </SubmitButton>
          </DialogFooter>
        </form>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === "cancel"}
        onClose={() => setOpen(null)}
        title={`Cancel ${p.orderNumber}?`}
        description={`The books go back into stock. This can't be undone.${p.isPaid ? " The customer has already paid: after cancelling, send the money back and then use “Mark refunded”." : ""}`}
      >
        <form action={action} className="space-y-4">
          {hidden("cancel")}
          <NoteField label="Reason (the customer doesn't see this)" required error={state.fieldErrors?.note} />
          {state.error && !state.fieldErrors?.note && <Alert tone="error">{state.error}</Alert>}
          <DialogFooter>
            <SubmitButton variant="destructive" pending={pending} pendingLabel="Cancelling…">
              Cancel order
            </SubmitButton>
          </DialogFooter>
        </form>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === "refund"}
        onClose={() => setOpen(null)}
        title={`Mark ${p.orderNumber} as refunded?`}
        description={`Only after you have sent ${formatPKR(p.total)} back to the customer.`}
      >
        <form action={action} className="space-y-4">
          {hidden("refund")}
          <NoteField label="How was it refunded?" required error={state.fieldErrors?.note} />
          {state.error && !state.fieldErrors?.note && <Alert tone="error">{state.error}</Alert>}
          <DialogFooter>
            <SubmitButton pending={pending} pendingLabel="Saving…">
              Mark refunded
            </SubmitButton>
          </DialogFooter>
        </form>
      </ConfirmDialog>
    </div>
  );
}

/** Private note on the order's history. */
export function AddNoteForm({ orderId, updatedAt }: { orderId: string; updatedAt: string }) {
  const [state, action, pending] = useActionState<OrderActionState, FormData>(updateOrder, {});
  useEffect(() => {
    if (state.ok) toast.success("Note added");
    else if (state.error) toast.error(state.error);
  }, [state]);
  return (
    <form key={state.ok ? state.attempt : "note"} action={action} className="space-y-2">
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="expectedUpdatedAt" value={updatedAt} />
      <input type="hidden" name="action" value="note" />
      <NoteField label="Add a private note" required error={state.fieldErrors?.note} />
      <SubmitButton variant="outline" size="sm" className="h-11 px-3 sm:h-8" pending={pending} pendingLabel="Adding…">
        Add note
      </SubmitButton>
    </form>
  );
}

function NoteField({ label, required, error }: { label: string; required?: boolean; error?: string }) {
  return (
    <label className="block space-y-1 text-sm font-medium">
      {label}
      <Textarea name="note" rows={2} maxLength={500} required={required} aria-invalid={Boolean(error) || undefined} />
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}

function ConfirmDialog({
  open,
  onClose,
  title,
  description,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
