import type { Metadata } from "next";
import Link from "next/link";
import { Library } from "lucide-react";
import { BookGridSkeleton } from "@/components/book/book-card-skeleton";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "All books",
  description: "Browse exam, test-prep and academic books from all publishers.",
};

/** Placeholder until the catalogue is built (Phase 2 screens, Phase 4 real data). */
export default function BooksPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">All books</h1>
      <EmptyState
        icon={Library}
        title="The full catalogue is on its way"
        description="Search, exam and publisher filters arrive in the next phase. For now, call or WhatsApp 0324-9574895 to order any book."
        action={
          <Button asChild size="pill">
            <Link href="/">Back to home</Link>
          </Button>
        }
      />
      <div className="mt-10 opacity-60">
        <BookGridSkeleton count={4} />
      </div>
    </div>
  );
}
