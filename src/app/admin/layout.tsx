import type { Metadata } from "next";

/**
 * Admin pages must check the session on every request before showing anything,
 * so they are allowed to block instead of showing an instant prerendered shell.
 * (Scoped to /admin only; the shop keeps Next.js's instant-navigation checks.)
 */
export const instant = false;

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | Admin | Dogar's Unique Books" },
  // The admin area must never appear in search engines.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-svh flex-1 flex-col bg-background">{children}</div>;
}
