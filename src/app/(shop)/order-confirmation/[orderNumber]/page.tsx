import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { CheckCircle2, Clock, MapPin, MessageCircle, Package, SearchX, Wallet } from "lucide-react";
import { deliveryOptions } from "@/config/site";
import { paymentLabels } from "@/lib/checkout/rules";
import { fetchOrderForCustomer, fetchPaymentDetails, type CustomerOrder, type PaymentDetails } from "@/lib/db/customer-orders";
import { formatPKR, whatsappLink } from "@/lib/format";
import { Alert } from "@/components/feedback/alert";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "Your order",
  // Personal order pages must never appear in search engines.
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default function OrderConfirmationPage({ params, searchParams }: PageProps<"/order-confirmation/[orderNumber]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 lg:px-8">
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-3xl" />}>
        {Promise.all([params, searchParams]).then(([p, sp]) => (
          <OrderView orderNumber={p.orderNumber} token={typeof sp.t === "string" ? sp.t : ""} />
        ))}
      </Suspense>
    </div>
  );
}

async function OrderView({ orderNumber, token }: { orderNumber: string; token: string }) {
  await connection(); // always read fresh, never cache someone's order
  const order = await fetchOrderForCustomer(orderNumber, token);
  if (!order) {
    return (
      <EmptyState
        icon={SearchX}
        title="Order not found"
        description="This link is incomplete or has expired. Use the full link from your order, or WhatsApp us on 0324-9574895 with your order number."
        action={
          <Button asChild size="pill">
            <Link href="/books">Browse books</Link>
          </Button>
        }
      />
    );
  }
  const payment = order.paymentMethod === "cod" ? null : await fetchPaymentDetails();
  return <OrderDetails order={order} payment={payment} />;
}

const statusLabel: Record<string, string> = {
  pending: "Received",
  confirmed: "Confirmed",
  processing: "Being packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function OrderDetails({ order, payment }: { order: CustomerOrder; payment: PaymentDetails | null }) {
  const delivery = deliveryOptions.find((o) => o.id === order.deliveryMethod)?.label ?? order.deliveryMethod;
  const isTransfer = order.paymentMethod !== "cod";
  const account = order.paymentMethod === "jazzcash" ? payment?.jazzcash : order.paymentMethod === "easypaisa" ? payment?.easypaisa : null;
  const whatsappText = `Assalam-o-Alaikum, my order number is ${order.orderNumber}.`;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-success" aria-hidden />
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {order.status === "cancelled" ? "This order was cancelled" : "Thank you, your order is placed"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Keep this page or its link: it&apos;s how you can check your order.</p>
        <p className="mx-auto mt-4 w-fit rounded-2xl bg-surface px-6 py-3 ring-1 ring-border">
          <span className="block text-xs text-muted-foreground">Order number</span>
          <span className="text-2xl font-semibold tracking-wide">{order.orderNumber}</span>
        </p>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Badge variant="secondary">
            <Package aria-hidden /> Order: {statusLabel[order.status] ?? order.status}
          </Badge>
          <Badge variant={order.paymentStatus === "paid" ? "success" : "warning"}>
            <Wallet aria-hidden />
            {order.paymentStatus === "paid"
              ? "Payment received"
              : isTransfer
                ? "Payment pending verification"
                : "Pay in cash on delivery"}
          </Badge>
        </div>
      </div>

      {order.status !== "cancelled" &&
        (isTransfer ? (
          <section aria-labelledby="pay-title" className="space-y-3 rounded-3xl bg-warning-soft/60 p-5 ring-1 ring-warning/30">
            <h2 id="pay-title" className="flex items-center gap-2 font-semibold">
              <Clock className="size-4" aria-hidden /> Next step: send {formatPKR(order.total)} by {paymentLabels[order.paymentMethod]}
            </h2>
            {account?.number ? (
              <dl className="grid gap-2 rounded-2xl bg-card p-4 text-sm ring-1 ring-border sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-muted-foreground">{paymentLabels[order.paymentMethod]} number</dt>
                  <dd className="text-lg font-semibold tabular-nums">{account.number}</dd>
                </div>
                {account.title && (
                  <div>
                    <dt className="text-xs text-muted-foreground">Account name</dt>
                    <dd className="font-medium">{account.title}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-xs text-muted-foreground">Exact amount</dt>
                  <dd className="text-lg font-semibold tabular-nums">{formatPKR(order.total)}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm">We&apos;ll send you our {paymentLabels[order.paymentMethod]} details on WhatsApp shortly.</p>
            )}
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>
                Write your order number <strong>{order.orderNumber}</strong> in the payment note.
              </li>
              <li>Send the payment screenshot to us on WhatsApp.</li>
              <li>We dispatch your books after we confirm the payment in our account.</li>
            </ol>
            {payment?.instructions && <p className="text-xs text-muted-foreground">{payment.instructions}</p>}
          </section>
        ) : (
          <Alert tone="info" title="Next step">
            Pay in cash when your books arrive by {delivery}. We may call or WhatsApp you on {order.customerPhone} to confirm
            your order before dispatch.
          </Alert>
        ))}

      <section aria-labelledby="items-title" className="rounded-3xl bg-card p-5 ring-1 ring-border">
        <h2 id="items-title" className="mb-3 font-semibold">
          Your books
        </h2>
        <ul className="divide-y divide-border text-sm">
          {order.items.map((i, n) => (
            <li key={n} className="flex justify-between gap-4 py-2">
              <span>
                {i.title} <span className="text-muted-foreground">× {i.quantity}</span>
              </span>
              <span className="font-medium tabular-nums">{formatPKR(i.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd className="tabular-nums">{formatPKR(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery ({delivery})</dt>
            <dd className="tabular-nums">{formatPKR(order.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between text-base font-semibold">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatPKR(order.total)}</dd>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <dt>Payment</dt>
            <dd>{paymentLabels[order.paymentMethod]}</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="ship-title" className="rounded-3xl bg-card p-5 text-sm ring-1 ring-border">
        <h2 id="ship-title" className="mb-2 flex items-center gap-2 font-semibold">
          <MapPin className="size-4" aria-hidden /> Delivering to
        </h2>
        <p>{order.customerName}</p>
        <p>{order.customerPhone}</p>
        <p>
          {order.address}, {order.city}
        </p>
        {order.notes && <p className="mt-1 text-muted-foreground">Notes: {order.notes}</p>}
      </section>

      <div className="flex flex-wrap justify-center gap-2">
        <Button asChild size="pill" className="bg-whatsapp hover:bg-whatsapp/90">
          <a href={whatsappLink(payment?.whatsapp ?? "923249574895", whatsappText)} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden /> WhatsApp us about this order
          </a>
        </Button>
        <Button asChild variant="outline" size="pill">
          <Link href="/books">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
