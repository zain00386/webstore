import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { ChevronRight, Inbox } from "lucide-react";
import { adminOrdersHref, orderViews, ORDERS_PER_PAGE, parseAdminOrdersQuery } from "@/lib/admin/orders-list";
import { requireAdmin } from "@/lib/auth/admin";
import { paymentLabels } from "@/lib/checkout/rules";
import { fetchAdminOrders } from "@/lib/db/admin-orders";
import { formatPKR } from "@/lib/format";
import { createSessionClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/admin/order-badges";
import { EmptyState } from "@/components/feedback/empty-state";
import { Pagination } from "@/components/layout/pagination";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Orders" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

const placed = new Intl.DateTimeFormat("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Karachi" });

export default async function AdminOrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requireAdmin();
  const query = parseAdminOrdersQuery(await searchParams);
  const db = await createSessionClient();
  const { rows, total } = await fetchAdminOrders(db, query);
  const pageCount = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {query.view === "action"
            ? "New orders and payments waiting for you, oldest first."
            : "Search by order number, phone number or customer name."}
        </p>
      </div>

      <nav aria-label="Order filters" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {orderViews.map((v) => (
          <Link
            key={v.id}
            href={adminOrdersHref({ view: v.id, q: query.q })}
            aria-current={query.view === v.id ? "page" : undefined}
            className={cn(
              "flex min-h-10 shrink-0 items-center rounded-full px-4 text-sm font-medium ring-1 ring-border hover:bg-muted",
              query.view === v.id && "bg-primary text-primary-foreground ring-primary hover:bg-primary",
            )}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      <Form action="/admin/orders" className="flex flex-wrap items-end gap-2 rounded-2xl bg-surface p-3 ring-1 ring-border">
        {query.view !== "action" && <input type="hidden" name="view" value={query.view} />}
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium">
          Search
          <input
            name="q"
            type="search"
            defaultValue={query.q}
            placeholder="DUB-10001, 0300 1234567 or name"
            className="h-10 rounded-lg border border-input bg-card px-3 text-sm font-normal"
          />
        </label>
        <Button type="submit">Search</Button>
        {query.q && (
          <Button asChild variant="ghost">
            <Link href={adminOrdersHref({ view: query.view })}>Clear</Link>
          </Button>
        )}
      </Form>

      <p className="text-sm text-muted-foreground">
        {total} order{total === 1 ? "" : "s"}
        {pageCount > 1 && ` (page ${query.page} of ${pageCount})`}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={query.view === "action" && !query.q ? "Nothing waiting" : "No orders found"}
          description={query.view === "action" && !query.q ? "New orders and payments to verify will appear here." : "Try another filter or search."}
        />
      ) : (
        <>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card ring-1 ring-border">
            {rows.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-3 p-4 hover:bg-muted/50">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-semibold tracking-wide">{o.order_number}</span>
                      <OrderStatusBadge status={o.status} />
                      <PaymentStatusBadge status={o.payment_status} method={o.payment_method} />
                    </div>
                    <p className="truncate text-sm">
                      {o.customer_name} · {o.customer_phone} · {o.city}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {placed.format(new Date(o.created_at))} · {paymentLabels[o.payment_method]} ·{" "}
                      {o.delivery_method === "courier" ? "Courier" : "Pakistan Post"}
                    </p>
                  </div>
                  <span className="font-semibold tabular-nums">{formatPKR(o.total)}</span>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
          <Pagination page={query.page} pageCount={pageCount} hrefFor={(page) => adminOrdersHref({ ...query, page })} />
        </>
      )}
    </div>
  );
}
