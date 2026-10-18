import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminComingSoon } from "@/components/admin/admin-coming-soon";

export const metadata: Metadata = { title: "Settings" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function AdminSettingsPage() {
  await requireAdmin();
  return (
    <AdminComingSoon
      title="Settings"
      phase="Phase 12"
      description="Store details, delivery charges, Cash on Delivery on/off, and your JazzCash / Easypaisa account details."
    />
  );
}
