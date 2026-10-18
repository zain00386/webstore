import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Terms & conditions" };

export default function TermsPage() {
  return <ComingSoon title="Terms & conditions" phase="Phase 2" />;
}
