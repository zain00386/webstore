"use server";

import { paymentSettingsFromFormData, paymentSettingsSchema, toSettingsRow } from "@/lib/admin/payment-settings-schema";
import { storeSettingsFromFormData, storeSettingsSchema, toStoreSettingsRow, type StoreSettingsInput } from "@/lib/admin/store-settings-schema";
import { requireAdmin } from "@/lib/auth/admin";
import { refreshShop } from "@/lib/db/refresh-shop";
import { createSessionClient } from "@/lib/supabase/server";

export type PaymentSettingsInput = ReturnType<typeof paymentSettingsFromFormData>;

export type PaymentSettingsState = {
  ok?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** What the admin typed, so a failed save doesn't wipe the form. */
  values?: PaymentSettingsInput;
  updatedAt?: string;
  attempt?: number;
};

export async function savePaymentSettings(_prev: PaymentSettingsState, fd: FormData): Promise<PaymentSettingsState> {
  await requireAdmin();
  const input = paymentSettingsFromFormData(fd);
  const parsed = paymentSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return { error: "Please fix the highlighted fields.", fieldErrors, values: input, attempt: Date.now() };
  }

  // Database rules also check this is an admin. updated_at stops two people overwriting each other.
  const db = await createSessionClient();
  const { data, error } = await db
    .from("store_settings")
    .update(toSettingsRow(parsed.data))
    .eq("id", true)
    .eq("updated_at", parsed.data.updatedAt)
    .select("updated_at");
  if (error) {
    console.error("save payment settings failed", error.code);
    return { error: "Couldn't save. Please try again.", values: input, attempt: Date.now() };
  }
  if (!data.length) {
    return {
      error: "These settings were changed somewhere else (another tab or admin). Reload the page to see the latest, then try again.",
      values: input,
      attempt: Date.now(),
    };
  }
  refreshShop(); // checkout shows the switched-on payment methods straight away
  return { ok: "Payment details saved.", updatedAt: data[0].updated_at, attempt: Date.now() };
}

export type StoreSettingsState = {
  ok?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: StoreSettingsInput;
  updatedAt?: string;
  attempt?: number;
};

/** Store contact, delivery fees/switches, COD and the low-stock level. */
export async function saveStoreSettings(_prev: StoreSettingsState, fd: FormData): Promise<StoreSettingsState> {
  await requireAdmin();
  const input = storeSettingsFromFormData(fd);
  const fail = (s: Omit<StoreSettingsState, "values" | "attempt">): StoreSettingsState => ({ ...s, values: input, attempt: Date.now() });
  const parsed = storeSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0] ?? "form")] ??= issue.message;
    return fail({ error: "Please fix the highlighted fields.", fieldErrors });
  }

  const db = await createSessionClient();
  // Pakistan Post is pay-in-advance only: it needs at least one advance payment method on.
  if (parsed.data.pakistanPostEnabled) {
    const { data: pay } = await db.from("store_settings").select("jazzcash_enabled, easypaisa_enabled, bank_enabled").eq("id", true).single();
    if (pay && !pay.jazzcash_enabled && !pay.easypaisa_enabled && !pay.bank_enabled) {
      return fail({
        error: "Pakistan Post needs JazzCash, Easypaisa or bank transfer switched on (below), because it is pay-in-advance only.",
        fieldErrors: { pakistanPostEnabled: "Switch on a payment account below first" },
      });
    }
  }

  const { data, error } = await db
    .from("store_settings")
    .update(toStoreSettingsRow(parsed.data))
    .eq("id", true)
    .eq("updated_at", parsed.data.updatedAt)
    .select("updated_at");
  if (error) {
    console.error("save store settings failed", error.code);
    return fail({
      error: /delivery_notes|column/i.test(error.message)
        ? "The database needs an update first: paste supabase/migrations/20261021000008_delivery_notes.sql into the Supabase SQL Editor and click Run."
        : "Couldn't save. Please try again.",
    });
  }
  if (!data.length) {
    return fail({ error: "These settings were changed somewhere else (another tab or admin). Reload the page to see the latest, then try again." });
  }
  refreshShop(); // the whole shop shows the new fees and contact details straight away
  return { ok: "Store and delivery settings saved.", updatedAt: data[0].updated_at, attempt: Date.now() };
}
