import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Returns & exchanges" };

export default function ReturnsPage() {
  return <ComingSoon title="Returns & exchanges" phase="Phase 2" />;
}
