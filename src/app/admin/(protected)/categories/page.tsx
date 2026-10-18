import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminComingSoon } from "@/components/admin/admin-coming-soon";

export const metadata: Metadata = { title: "Categories" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function AdminCategoriesPage() {
  await requireAdmin();
  return <AdminComingSoon title="Categories" phase="Phase 6" description="Add, rename, reorder and hide book categories." />;
}
