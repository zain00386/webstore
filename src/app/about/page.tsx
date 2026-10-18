import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "About us" };

export default function AboutPage() {
  return <ComingSoon title="About us" phase="Phase 2" />;
}
