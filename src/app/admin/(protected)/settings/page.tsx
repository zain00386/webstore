import type { Metadata } from "next";
import { fromWhatsAppE164 } from "@/lib/admin/store-settings-schema";
import { requireAdmin } from "@/lib/auth/admin";
import { createSessionClient } from "@/lib/supabase/server";
import { Alert } from "@/components/feedback/alert";
import { PaymentSettingsForm } from "./payment-form";
import { StoreSettingsForm } from "./store-form";

export const metadata: Metadata = { title: "Settings" };

// Admin pages verify the session before rendering, so they may block (see admin/layout.tsx).
export const instant = false;

export default async function AdminSettingsPage() {
  await requireAdmin();
  // Read as the signed-in admin: only admins may read (and change) settings.
  const db = await createSessionClient();
  const { data: s, error } = await db.from("store_settings").select("*").eq("id", true).single();
  const needsUpdate = !s || error || !("bank_enabled" in s) || !("delivery_notes" in s);

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Changes show on the website straight away. Each section has its own Save button.
        </p>
      </div>

      {needsUpdate || !s ? (
        <Alert tone="warning" title="Database update needed">
          Paste the new files from <code>supabase/migrations/</code> (0005 to 0009) into the Supabase SQL Editor and click
          Run, then reload this page. <code>npm run db:check</code> lists what&apos;s missing.
        </Alert>
      ) : (
        <>
          <StoreSettingsForm
            initial={{
              updatedAt: s.updated_at,
              phone: s.phone,
              whatsapp: fromWhatsAppE164(s.whatsapp_e164),
              address: s.address,
              pakistanPostEnabled: s.pakistan_post_enabled,
              pakistanPostFee: String(Number(s.pakistan_post_fee)),
              courierEnabled: s.courier_enabled,
              courierFee: String(Number(s.courier_fee)),
              codEnabled: s.cod_enabled,
              deliveryNotes: s.delivery_notes,
              lowStockThreshold: s.low_stock_threshold == null ? "" : String(s.low_stock_threshold),
            }}
          />

          <section aria-labelledby="pay-title" className="space-y-4">
            <div>
              <h2 id="pay-title" className="text-lg font-semibold">
                Payment accounts
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Shown only on a customer&apos;s own order page after they order, never on public pages.
              </p>
            </div>
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
          </section>

          <Alert tone="info" title="Online card payments">
            The shop takes JazzCash, Easypaisa and bank transfers by hand (you check the money arrived), plus Cash on
                Delivery. An automatic card or wallet gateway isn&apos;t connected. Before adding one, confirm with the provider
                (e.g. your bank, JazzCash or Easypaisa merchant services) that your business is eligible, and agree their fees,
                refund rules and settlement times.
          </Alert>
        </>
      )}
    </div>
  );
}
