import type { Metadata } from "next";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Job vacancies & blog" };

export default function BlogPage() {
  return <ComingSoon title="Job vacancies & blog" phase="Phase 2 (screen) and Phase 11 (publishing)" />;
}
