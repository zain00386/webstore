import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** The one loading indicator used across the site. Decorative: pair it with visible "…ing" text. */
export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn("animate-spin motion-reduce:animate-[spin_1.5s_linear_infinite]", className)} aria-hidden />;
}
