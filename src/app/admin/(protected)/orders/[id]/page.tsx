import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { paymentLabels } from "@/lib/checkout/rules";
import { fetchAdminOrder, type AdminOrderDetail } from "@/lib/db/admin-orders";
import { formatPKR, whatsappLink } from "@/lib/format";
import { actionLabels, allowedActions, isPrepaid, orderStatusLabels, paymentStatusLabels, shipBlockedReason } from "@/lib/orders/admin-actions";
import { createSessionClient } from "@/lib/supabase/server";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/order-badges";
import { Alert } from "@/components/feedback/alert";
import { Button } from "@/components/ui/button";
import { AddNoteForm, OrderActions } from "../order-actions";

export const metadata: Metadata = { title: "Order" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

const when = new Intl.DateTimeFormat("en-PK", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" });
const fmt = (iso: string | null) => (iso ? when.format(new Date(iso)) : null);

export default async function AdminOrderPage({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = await createSessionClient();
  const order = await fetchAdminOrder(db, id);
  if (!order) notFound();

  const prepaid = isPrepaid(order.payment_method);
  const whatsappPhone = `92${order.customer_phone.slice(1)}`;

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/orders" className="inline-flex min-h-10 items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden /> All orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-wide">{order.order_number}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Placed {fmt(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.payment_status} method={order.payment_method} />
        </div>
      </div>

      {order.status === "cancelled" && order.payment_status === "paid" && (
        <Alert tone="warning" title="Refund due">
          This order was cancelled after the customer paid {formatPKR(order.total)}. Send the money back, then use
          &ldquo;Mark refunded&rdquo;.
        </Alert>
      )}

      <section aria-labelledby="actions-title" className="space-y-3 rounded-2xl bg-surface p-5 ring-1 ring-border">
        <h2 id="actions-title" className="font-semibold">
          What next?
        </h2>
        <OrderActions
          key={order.updated_at}
          orderId={order.id}
          orderNumber={order.order_number}
          updatedAt={order.updated_at}
          actions={allowedActions(order)}
          paymentLabel={paymentLabels[order.payment_method]}
          isPrepaid={prepaid}
          isPaid={order.payment_status === "paid"}
          total={order.total}
          defaultCourier={order.delivery_method === "pakistan_post" ? "Pakistan Post" : "TCS"}
          shipBlockedReason={shipBlockedReason(order)}
        />
      </section>

      <div className="grid gap-6 md:grid-cols-[repeat(2,minmax(0,1fr))]">
        <section aria-labelledby="customer-title" className="min-w-0 space-y-2 rounded-2xl bg-card p-5 text-sm ring-1 ring-border">
          <h2 id="customer-title" className="font-semibold">
            Customer
          </h2>
          <p className="font-medium break-words">{order.customer_name}</p>
          <p className="tabular-nums">{order.customer_phone}</p>
          {order.customer_email && <p className="break-all">{order.customer_email}</p>}
          <p className="break-words">
            {order.address}, {order.city}
          </p>
          {order.notes && <p className="rounded-lg bg-muted p-2 break-words">Customer note: {order.notes}</p>}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button asChild variant="outline" size="sm" className="h-11 px-3 sm:h-8">
              <a href={`tel:${order.customer_phone}`}>
                <Phone aria-hidden /> Call
              </a>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-11 px-3 sm:h-8">
              <a
                href={whatsappLink(whatsappPhone, `Assalam-o-Alaikum ${order.customer_name}, this is Dogar's Unique Books Rawalpindi about your order ${order.order_number}.`)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <WhatsAppIcon /> WhatsApp
              </a>
            </Button>
          </div>
        </section>

        <section aria-labelledby="delivery-title" className="min-w-0 space-y-2 rounded-2xl bg-card p-5 text-sm ring-1 ring-border">
          <h2 id="delivery-title" className="font-semibold">
            Payment & delivery
          </h2>
          <Row label="Payment">
            {paymentLabels[order.payment_method]} · {paymentStatusLabels[order.payment_status]}
          </Row>
          {order.paid_at && <Row label="Marked paid">{fmt(order.paid_at)}</Row>}
          <Row label="Delivery">{order.delivery_method === "courier" ? "Courier (TCS / Leopards / M&P)" : "Pakistan Post"}</Row>
          {order.shipped_at && (
            <Row label="Shipped">
              {fmt(order.shipped_at)}
              {order.shipped_via && ` · ${order.shipped_via}`}
              {order.tracking_number && ` · ${order.tracking_number}`}
            </Row>
          )}
          {order.delivered_at && <Row label="Delivered">{fmt(order.delivered_at)}</Row>}
          {order.cancelled_at && (
            <Row label="Cancelled">
              {fmt(order.cancelled_at)}
              {order.cancel_reason && ` · ${order.cancel_reason}`}
            </Row>
          )}
          {order.stock_restored_at && <Row label="Stock returned">{fmt(order.stock_restored_at)}</Row>}
        </section>
      </div>

      <section aria-labelledby="items-title" className="rounded-2xl bg-card p-5 ring-1 ring-border">
        <h2 id="items-title" className="mb-3 font-semibold">
          Books
        </h2>
        <ul className="divide-y divide-border text-sm">
          {order.items.map((i, n) => (
            <li key={n} className="flex justify-between gap-4 py-2">
              <span>
                {i.book_id ? (
                  <Link href={`/admin/books/${i.book_id}/edit`} className="hover:underline">
                    {i.title_snapshot}
                  </Link>
                ) : (
                  i.title_snapshot
                )}{" "}
                <span className="text-muted-foreground">
                  × {i.quantity} @ {formatPKR(i.unit_price)}
                </span>
              </span>
              <span className="font-medium tabular-nums">{formatPKR(i.line_total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <Total label="Subtotal" value={order.subtotal} />
          <Total label="Delivery" value={order.delivery_fee} />
          <Total label="Total" value={order.total} strong />
        </dl>
      </section>

      <section aria-labelledby="history-title" className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
        <h2 id="history-title" className="font-semibold">
          History
        </h2>
        <ol className="space-y-3 border-l border-border pl-4 text-sm">
          {order.events.map((e) => (
            <li key={e.id}>
              <p className="font-medium">{eventText(e)}</p>
              <p className="text-xs text-muted-foreground">
                {fmt(e.created_at)} · {e.actor_id ? "Admin" : "Website"}
              </p>
              {e.note && e.event !== "created" && <p className="mt-0.5 text-muted-foreground">{e.note}</p>}
            </li>
          ))}
        </ol>
        <AddNoteForm key={order.updated_at} orderId={order.id} updatedAt={order.updated_at} />
      </section>
    </div>
  );
}

function eventText(e: AdminOrderDetail["events"][number]): string {
  if (e.event === "created") return "Order placed on the website";
  if (e.event === "note") return "Note";
  const label = actionLabels[e.event as keyof typeof actionLabels] ?? e.event;
  const to = e.to_value
    ? (orderStatusLabels[e.to_value as keyof typeof orderStatusLabels] ?? paymentStatusLabels[e.to_value as keyof typeof paymentStatusLabels] ?? e.to_value)
    : null;
  return to ? `${label} → ${to}` : label;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <p className="flex gap-2">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

function Total({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-semibold" : ""}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{formatPKR(value)}</dd>
    </div>
  );
}
