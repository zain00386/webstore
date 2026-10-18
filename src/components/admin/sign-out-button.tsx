"use client";

import { useState } from "react";
import { LoaderCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton({ label = "Sign out", className }: { label?: string; className?: string }) {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await fetch("/admin/login/logout", { method: "POST" });
        } finally {
          // Deliberate full page load (not router.push): no admin content can linger
          // in the client after signing out, and the session cookie is re-read fresh.
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.assign("/admin/login?signed_out=1");
        }
      }}
    >
      {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
      {label}
    </Button>
  );
}
