import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminComingSoon } from "@/components/admin/admin-coming-soon";

export const metadata: Metadata = { title: "Posts" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function AdminPostsPage() {
  await requireAdmin();
  return (
    <AdminComingSoon
      title="Posts"
      phase="Phase 11"
      description="Write and publish job vacancies and blog articles, with the books to prepare for each test."
    />
  );
}
