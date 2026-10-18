"use client";

import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Uses the phone's share sheet when available, otherwise copies the link. */
export function ShareButton({ title, path }: { title: string; path: string }) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={async () => {
        const url = new URL(path, window.location.origin).toString();
        try {
          if (navigator.share) {
            await navigator.share({ title, url });
            return;
          }
          await navigator.clipboard.writeText(url);
          toast.success("Link copied");
        } catch (e) {
          // The user closed the share sheet: not an error.
          if ((e as Error).name !== "AbortError") toast.error("Could not share this link");
        }
      }}
    >
      <Share2 aria-hidden /> Share
    </Button>
  );
}
