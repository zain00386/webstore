import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Shipping & delivery" };

export default function ShippingPage() {
  return <ComingSoon title="Shipping & delivery" phase="Phase 2" />;
}
