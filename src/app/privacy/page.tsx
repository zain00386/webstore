import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return <ComingSoon title="Privacy policy" phase="Phase 2" />;
}
