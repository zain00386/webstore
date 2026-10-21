import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, BookCopy, EyeOff, PackageX, ShoppingCart, Wallet } from "lucide-react";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { Alert } from "@/components/feedback/alert";

export const metadata: Metadata = { title: "Overview" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

type Stat = { label: string; value: number | null; icon: typeof BookCopy; href?: string; tone?: "warn" };

export default async function AdminOverviewPage() {
  await requireAdmin();
  // Reads as the signed-in admin: database security rules apply (no master key here).
  const db = await createSessionClient();
  const count = async (q: PromiseLike<{ count: number | null; error: unknown }>) => {
    const { count: n, error } = await q;
    return error ? null : (n ?? 0);
  };

  const [activeBooks, hiddenBooks, outOfStock, pendingOrders, pendingPayments] = await Promise.all([
    count(db.from("books").select("id", { count: "exact", head: true }).eq("is_active", true)),
    count(db.from("books").select("id", { count: "exact", head: true }).eq("is_active", false)),
    count(db.from("books").select("id", { count: "exact", head: true }).eq("is_active", true).eq("stock_quantity", 0)),
    count(db.from("orders").select("id", { count: "exact", head: true }).eq("status", "pending")),
    count(
      db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("payment_status", "pending")
        .neq("payment_method", "cod")
        .neq("status", "cancelled"),
    ),
  ]);

  const stats: Stat[] = [
    { label: "Books on sale", value: activeBooks, icon: BookCopy },
    { label: "Out of stock", value: outOfStock, icon: PackageX, tone: "warn" },
    { label: "Hidden books", value: hiddenBooks, icon: EyeOff },
    { label: "New orders", value: pendingOrders, icon: ShoppingCart, href: "/admin/orders?view=pending" },
    { label: "Payments to verify", value: pendingPayments, icon: Wallet, tone: "warn", href: "/admin/orders?view=verify" },
  ];
  const failed = stats.some((s) => s.value === null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live numbers from your database.</p>
      </div>

      {failed && (
        <Alert tone="error" title="Some numbers could not be loaded">
          Refresh the page. If it keeps happening, run <code>npm run db:check</code>.
        </Alert>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, tone, href }) => {
          const body = (
            <>
              <div className="mb-3 flex items-center justify-between text-muted-foreground">
                <span className="text-sm">{label}</span>
                <Icon className="size-4" aria-hidden />
              </div>
              <p className={`text-3xl font-semibold tabular-nums ${tone === "warn" && value ? "text-brand" : ""}`}>
                {value ?? "–"}
              </p>
            </>
          );
          return (
            <li key={label}>
              {href ? (
                <Link href={href} className="block h-full rounded-2xl bg-card p-5 ring-1 ring-border hover:ring-primary">
                  {body}
                </Link>
              ) : (
                <div className="h-full rounded-2xl bg-card p-5 ring-1 ring-border">{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="rounded-2xl bg-surface p-5 ring-1 ring-border">
        <h2 className="mb-2 font-semibold">Coming next</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          <li>Posts: publish job vacancies and articles (Phase 11)</li>
          <li>Settings: delivery fees and store details (Phase 12)</li>
        </ul>
        {outOfStock === 0 && (
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <AlertTriangle className="size-3.5" aria-hidden />
            Every book currently shows the starting stock of 10 until you set real counts.
          </p>
        )}
      </section>
    </div>
  );
}
