"use client";

import { useState } from "react";
import { LogIn } from "lucide-react";
import { Alert } from "@/components/feedback/alert";
import { FormField } from "@/components/forms/form-field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";

type LoginResult =
  | { ok: true; redirectTo: string }
  | { ok: false; error?: string; fieldErrors?: { email?: string; password?: string } };

export function LoginForm({ next }: { next: string }) {
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<LoginResult | null>(null);
  const failed = result && !result.ok ? result : null;

  return (
    <form
      noValidate
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        setPending(true);
        setResult(null);
        try {
          const res = await fetch("/admin/login/submit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: data.get("email"), password: data.get("password"), next }),
          });
          const json = (await res.json()) as LoginResult;
          if (json.ok) {
            // Full page load so the admin area is rendered fresh with the new session.
            window.location.assign(json.redirectTo);
            return;
          }
          setResult(json);
        } catch {
          setResult({ ok: false, error: "Could not reach the server. Check your connection and try again." });
        }
        setPending(false);
      }}
    >
      {failed?.error && <Alert tone="error">{failed.error}</Alert>}
      <FormField label="Email" required error={failed?.fieldErrors?.email}>
        <Input name="email" type="email" autoComplete="username" autoFocus />
      </FormField>
      <FormField label="Password" required error={failed?.fieldErrors?.password}>
        <Input name="password" type="password" autoComplete="current-password" />
      </FormField>
      <SubmitButton size="pill" className="w-full" pending={pending} pendingLabel="Signing in…" icon={<LogIn aria-hidden />}>
        Sign in
      </SubmitButton>
    </form>
  );
}
