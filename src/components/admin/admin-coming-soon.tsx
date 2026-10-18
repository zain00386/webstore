import { Construction } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";

/** Placeholder for admin sections built in later phases (still admin-protected). */
export function AdminComingSoon({ title, phase, description }: { title: string; phase: string; description: string }) {
  return (
    <div className="max-w-3xl">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">{title}</h1>
      <EmptyState icon={Construction} title={`Coming in ${phase}`} description={description} />
    </div>
  );
}
