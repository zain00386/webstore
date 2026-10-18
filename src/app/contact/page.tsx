import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return <ComingSoon title="Contact" phase="Phase 2" />;
}
