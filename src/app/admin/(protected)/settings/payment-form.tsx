"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { Building2, LoaderCircle, Save, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { savePaymentSettings, type PaymentSettingsInput, type PaymentSettingsState } from "./actions";

export function PaymentSettingsForm({ initial }: { initial: PaymentSettingsInput }) {
  const [state, action, pending] = useActionState<PaymentSettingsState, FormData>(savePaymentSettings, {});
  useEffect(() => {
    if (state.ok) toast.success(state.ok);
    else if (state.error) toast.error(state.error);
  }, [state]);

  // After a failed save, show what was typed; after a good save, the page reloads fresh values.
  const v = state.values ?? initial;
  const updatedAt = state.updatedAt ?? initial.updatedAt;
  const err = state.fieldErrors ?? {};

  return (
    <form key={state.attempt ?? "initial"} action={action} className="space-y-5" noValidate>
      <input type="hidden" name="updatedAt" value={updatedAt} />
      {err.jazzcashEnabled && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {err.jazzcashEnabled}
        </p>
      )}

      <MethodCard icon={<Smartphone aria-hidden />} title="JazzCash" switchName="jazzcashEnabled" on={v.jazzcashEnabled}>
        <FormField label="JazzCash number" required error={err.jazzcashNumber} hint="The mobile number customers send money to.">
          <Input name="jazzcashNumber" defaultValue={v.jazzcashNumber} inputMode="tel" placeholder="0324-9574895" maxLength={16} />
        </FormField>
        <FormField label="Account name" required error={err.jazzcashTitle} hint="The name customers see when they send money.">
          <Input name="jazzcashTitle" defaultValue={v.jazzcashTitle} maxLength={120} />
        </FormField>
      </MethodCard>

      <MethodCard icon={<Smartphone aria-hidden />} title="Easypaisa" switchName="easypaisaEnabled" on={v.easypaisaEnabled}>
        <FormField label="Easypaisa number" required error={err.easypaisaNumber}>
          <Input name="easypaisaNumber" defaultValue={v.easypaisaNumber} inputMode="tel" placeholder="0324-9574895" maxLength={16} />
        </FormField>
        <FormField label="Account name" required error={err.easypaisaTitle}>
          <Input name="easypaisaTitle" defaultValue={v.easypaisaTitle} maxLength={120} />
        </FormField>
      </MethodCard>

      <MethodCard icon={<Building2 aria-hidden />} title="Bank transfer" switchName="bankEnabled" on={v.bankEnabled}>
        <FormField label="Bank name" required error={err.bankName}>
          <Input name="bankName" defaultValue={v.bankName} placeholder="e.g. Meezan Bank" maxLength={80} />
        </FormField>
        <FormField label="Account title" required error={err.bankTitle} hint="Exactly as the bank shows it.">
          <Input name="bankTitle" defaultValue={v.bankTitle} maxLength={120} />
        </FormField>
        <FormField label="Account number" required error={err.bankAccountNumber}>
          <Input name="bankAccountNumber" defaultValue={v.bankAccountNumber} inputMode="numeric" maxLength={40} />
        </FormField>
        <FormField label="IBAN" error={err.bankIban} hint="24 characters, starts with PK.">
          <Input name="bankIban" defaultValue={v.bankIban} placeholder="PK36SCBL0000001123456702" maxLength={34} className="uppercase" />
        </FormField>
      </MethodCard>

      <FormField
        label="Payment instructions"
        error={err.instructions}
        hint="Shown under the account details on the customer's order page."
      >
        <Textarea name="instructions" defaultValue={v.instructions} rows={3} maxLength={2000} />
      </FormField>

      <Button type="submit" size="pill" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />} Save payment details
      </Button>
    </form>
  );
}

function MethodCard({
  icon,
  title,
  switchName,
  on,
  children,
}: {
  icon: ReactNode;
  title: string;
  switchName: string;
  on: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
      <legend className="sr-only">{title}</legend>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-semibold [&_svg]:size-4">
          {icon} {title}
        </h2>
        <label className="flex min-h-10 items-center gap-2 text-sm font-medium">
          <input type="checkbox" name={switchName} defaultChecked={on} className="size-5 accent-[var(--primary)]" />
          Offer at checkout
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
