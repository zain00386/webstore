import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { Alert } from "@/components/feedback/alert";
import { PaymentSettingsForm } from "./payment-form";

export const metadata: Metadata = { title: "Settings" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function AdminSettingsPage() {
  await requireAdmin();
  const db = await createSessionClient();
  const { data: s, error } = await db
    .from("store_settings")
    .select(
      "updated_at, jazzcash_enabled, jazzcash_account_title, jazzcash_number, easypaisa_enabled, easypaisa_account_title, easypaisa_number, bank_enabled, bank_name, bank_account_title, bank_account_number, bank_iban, payment_instructions",
    )
    .eq("id", true)
    .single();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Payment accounts customers pay into. They&apos;re shown only on a customer&apos;s own order page after they
          order, never on public pages. Delivery charges and store details come in Phase 12.
        </p>
      </div>
      {error || !s ? (
        <Alert tone="warning" title="Database update needed">
          Paste <code>supabase/migrations/20261021000005_bank_transfer.sql</code> into the Supabase SQL Editor and
          click Run, then reload this page.
        </Alert>
      ) : (
        <PaymentSettingsForm
          initial={{
            updatedAt: s.updated_at,
            jazzcashEnabled: s.jazzcash_enabled,
            jazzcashTitle: s.jazzcash_account_title ?? "",
            jazzcashNumber: s.jazzcash_number ?? "",
            easypaisaEnabled: s.easypaisa_enabled,
            easypaisaTitle: s.easypaisa_account_title ?? "",
            easypaisaNumber: s.easypaisa_number ?? "",
            bankEnabled: s.bank_enabled,
            bankName: s.bank_name ?? "",
            bankTitle: s.bank_account_title ?? "",
            bankAccountNumber: s.bank_account_number ?? "",
            bankIban: s.bank_iban ?? "",
            instructions: s.payment_instructions,
          }}
        />
      )}
    </div>
  );
}
