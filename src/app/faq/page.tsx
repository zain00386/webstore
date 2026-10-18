import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "FAQ" };

export default function FaqPage() {
  return <ComingSoon title="Frequently asked questions" phase="Phase 2" />;
}
