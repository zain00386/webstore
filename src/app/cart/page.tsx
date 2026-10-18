import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return <ComingSoon title="Your cart" phase="Phase 2 (screen) and Phase 7 (working cart)" />;
}
