import Link from "next/link";
import { Construction } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";

/**
 * Honest placeholder for routes that are linked from the navigation
 * but not built yet. Each one is replaced in the phase named on it.
 */
export function ComingSoon({ title, phase }: { title: string; phase: string }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">{title}</h1>
      <EmptyState
        icon={Construction}
        title="This page is being built"
        description={`Planned for ${phase}. Until then, call or WhatsApp us on 0324-9574895 for anything you need.`}
        action={
          <Button asChild size="pill">
            <Link href="/">Back to home</Link>
          </Button>
        }
      />
    </div>
  );
}
