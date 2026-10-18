import Link from "next/link";
import { SearchX } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";

/** For addresses that match no page at all (shop pages use (shop)/not-found.tsx). */
export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="mb-8">
        <Logo />
      </div>
      <EmptyState
        icon={SearchX}
        title="Page not found"
        description="The page you are looking for doesn't exist or has moved."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <Button asChild size="pill">
              <Link href="/books">Browse books</Link>
            </Button>
            <Button asChild variant="outline" size="pill">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        }
      />
    </main>
  );
}
