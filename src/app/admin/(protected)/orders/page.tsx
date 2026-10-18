import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminComingSoon } from "@/components/admin/admin-coming-soon";

export const metadata: Metadata = { title: "Orders" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function AdminOrdersPage() {
  await requireAdmin();
  return (
    <AdminComingSoon
      title="Orders"
      phase="Phase 10"
      description="See new orders, verify JazzCash / Easypaisa payments, and mark orders shipped, delivered or cancelled."
    />
  );
}
