import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Check, CheckCircle2, Clock, ListOrdered, MapPin, Package, SearchX, Wallet, XCircle } from "lucide-react";
import { deliveryOptions } from "@/config/site";
import { paymentLabels } from "@/lib/checkout/rules";
import { fetchOrderForCustomer, fetchPaymentDetails, type CustomerOrder, type PaymentDetails } from "@/lib/db/customer-orders";
import { formatPKR, whatsappLink } from "@/lib/format";
import { Alert } from "@/components/feedback/alert";
import { EmptyState } from "@/components/feedback/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/orders/copy-button";
import { RememberOrder } from "@/components/orders/remember-order";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import { cn } from "@/lib/utils";
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
        headingLevel={1}
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
  const payment = await fetchPaymentDetails();
  return (
    <>
      <RememberOrder orderNumber={order.orderNumber} token={token} />
      <OrderDetails order={order} payment={payment} />
    </>
  );
}

/** The normal journey of an order, shown as steps. "cancelled" is shown separately. */
const steps = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;

const placedAt = new Intl.DateTimeFormat("en-PK", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Karachi" });

const statusLabel: Record<string, string> = {
  pending: "Received",
  confirmed: "Confirmed",
  processing: "Being packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

function OrderDetails({ order, payment }: { order: CustomerOrder; payment: PaymentDetails }) {
  const delivery = deliveryOptions.find((o) => o.id === order.deliveryMethod)?.label ?? order.deliveryMethod;
  const isTransfer = order.paymentMethod !== "cod";
  const cancelled = order.status === "cancelled";
  const accountFields = payToFields(order.paymentMethod, payment);
  const whatsappText =
    isTransfer && order.paymentStatus !== "paid" && !cancelled
      ? `Assalam-o-Alaikum, I have sent ${formatPKR(order.total)} by ${paymentLabels[order.paymentMethod]} for order ${order.orderNumber}. Here is the payment screenshot:`
      : `Assalam-o-Alaikum, my order number is ${order.orderNumber}.`;
  const paymentBadge = paymentBadgeFor(order.paymentStatus, isTransfer, cancelled);

  return (
    <div className="space-y-6">
      <div className="text-center">
        {cancelled ? (
          <XCircle className="mx-auto size-14 text-destructive" aria-hidden />
        ) : (
          <CheckCircle2 className="mx-auto size-14 text-success" aria-hidden />
        )}
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {cancelled ? "This order was cancelled" : "Thank you, your order is placed"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Placed on {placedAt.format(new Date(order.createdAt))}</p>
        <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-2xl bg-surface py-3 pr-3 pl-6 ring-1 ring-border">
          <p>
            <span className="block text-xs text-muted-foreground">Order number</span>
            <span className="text-2xl font-semibold tracking-wide">{order.orderNumber}</span>
          </p>
          <CopyButton value={order.orderNumber} label="Order number" />
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          <Badge variant="secondary">
            <Package aria-hidden /> Order: {statusLabel[order.status] ?? order.status}
          </Badge>
          <Badge variant={paymentBadge.variant}>
            <Wallet aria-hidden />
            {paymentBadge.label}
          </Badge>
        </div>
      </div>

      {!cancelled && <OrderProgress status={order.status} />}

      {(order.status === "shipped" || order.status === "delivered") && order.shippedVia && (
        <Alert tone="success" title={order.status === "delivered" ? "Delivered" : "On its way"}>
          Sent with {order.shippedVia}
          {order.trackingNumber && (
            <>
              {" "}
              · tracking number <strong className="tabular-nums">{order.trackingNumber}</strong>
            </>
          )}
          .
        </Alert>
      )}

      {!cancelled &&
        order.paymentStatus !== "paid" &&
        (isTransfer ? (
          <section aria-labelledby="pay-title" className="space-y-3 rounded-3xl bg-warning-soft/60 p-5 ring-1 ring-warning/30">
            <h2 id="pay-title" className="flex items-center gap-2 font-semibold">
              <Clock className="size-4" aria-hidden /> Next step: send {formatPKR(order.total)} by {paymentLabels[order.paymentMethod]}
            </h2>
            {accountFields.length ? (
              <dl className="grid gap-3 rounded-2xl bg-card p-4 text-sm ring-1 ring-border sm:grid-cols-2">
                {accountFields.map((f) => (
                  <div key={f.label}>
                    <dt className="text-xs text-muted-foreground">{f.label}</dt>
                    <dd className={cn("flex items-center gap-1 break-all", f.copy ? "text-lg font-semibold tabular-nums" : "font-medium")}>
                      {f.value}
                      {f.copy && <CopyButton value={f.value.replace(/[\s-]/g, "")} label={f.label} />}
                    </dd>
                  </div>
                ))}
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
                Write your order number <strong>{order.orderNumber}</strong> in the payment note or reference.
              </li>
              <li>Send the payment screenshot to us on WhatsApp.</li>
              <li>We dispatch your books after we confirm the payment in our account.</li>
            </ol>
            {payment.instructions && <p className="text-xs text-muted-foreground">{payment.instructions}</p>}
            <p className="text-xs text-muted-foreground">
              Sending a screenshot doesn&apos;t mark the order paid by itself: the status here changes to
              &ldquo;Payment received&rdquo; once we see the money in our account.
            </p>
          </section>
        ) : (
          <Alert tone="info" title="Next step">
            Pay in cash when your books arrive by {delivery}. We may call or WhatsApp you on {order.customerPhone} to confirm
            your order before dispatch.
          </Alert>
        ))}

      {!cancelled && (
        <p className="rounded-2xl bg-surface px-4 py-3 text-sm text-muted-foreground ring-1 ring-border">
          We don&apos;t send SMS or email updates yet. Bookmark this page, or find it any time under{" "}
          <Link href="/orders" className="font-medium text-foreground underline underline-offset-4">
            My orders
          </Link>{" "}
          on this device. Anyone with this link can see your order, so share it only with us.
        </p>
      )}

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
          <a href={whatsappLink(payment.whatsapp, whatsappText)} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon /> WhatsApp us about this order
          </a>
        </Button>
        <Button asChild variant="outline" size="pill">
          <Link href="/books">Continue shopping</Link>
        </Button>
        <Button asChild variant="ghost" size="pill">
          <Link href="/orders">
            <ListOrdered aria-hidden /> My orders
          </Link>
        </Button>
      </div>
    </div>
  );
}

function paymentBadgeFor(
  status: string,
  isTransfer: boolean,
  cancelled: boolean,
): { label: string; variant: "success" | "warning" | "secondary" } {
  if (status === "paid") return { label: "Payment received", variant: "success" };
  if (status === "refunded") return { label: "Payment refunded", variant: "secondary" };
  if (cancelled) return { label: "No payment due", variant: "secondary" };
  if (status === "failed") return { label: "Payment not received", variant: "warning" };
  return isTransfer
    ? { label: "Payment pending verification", variant: "warning" }
    : { label: "Pay in cash on delivery", variant: "warning" };
}

/** Received → Confirmed → Being packed → Shipped → Delivered, with the current step highlighted. */
function OrderProgress({ status }: { status: string }) {
  const current = steps.indexOf(status as (typeof steps)[number]);
  return (
    <ol aria-label="Order progress" className="grid grid-cols-5 gap-1 rounded-3xl bg-card p-4 ring-1 ring-border">
      {steps.map((step, i) => {
        const done = i <= current;
        return (
          <li key={step} aria-current={i === current ? "step" : undefined} className="flex flex-col items-center gap-1.5 text-center">
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-semibold",
                done ? "bg-success text-white" : "bg-muted text-muted-foreground",
              )}
            >
              {done ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span className={cn("text-[0.7rem] leading-tight sm:text-xs", i === current ? "font-semibold" : "text-muted-foreground")}>
              {statusLabel[step]}
              {done && <span className="sr-only"> (done)</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** The shop's account details for this payment method (empty if the owner hasn't entered them). */
function payToFields(method: CustomerOrder["paymentMethod"], payment: PaymentDetails): { label: string; value: string; copy?: boolean }[] {
  const fields: { label: string; value: string | null | undefined; copy?: boolean }[] = [];
  if (method === "jazzcash" || method === "easypaisa") {
    const account = payment[method];
    if (!account?.number) return [];
    fields.push(
      { label: `${paymentLabels[method]} number`, value: account.number, copy: true },
      { label: "Account name", value: account.title },
    );
  } else if (method === "bank_transfer") {
    const bank = payment.bank;
    if (!bank?.number) return [];
    fields.push(
      { label: "Bank", value: bank.bankName },
      { label: "Account title", value: bank.title },
      { label: "Account number", value: bank.number, copy: true },
      { label: "IBAN", value: bank.iban, copy: true },
    );
  }
  return fields.filter((f): f is { label: string; value: string; copy?: boolean } => Boolean(f.value));
}
