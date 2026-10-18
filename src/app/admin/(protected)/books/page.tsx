import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminComingSoon } from "@/components/admin/admin-coming-soon";

export const metadata: Metadata = { title: "Books" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function AdminBooksPage() {
  await requireAdmin();
  return (
    <AdminComingSoon
      title="Books"
      phase="Phase 6"
      description="Search, add and edit books, change stock and prices, upload covers and hide books from the shop."
    />
  );
}
