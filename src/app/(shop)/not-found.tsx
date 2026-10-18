import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 lg:px-8">
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
    </div>
  );
}
