"use server";

import { paymentSettingsFromFormData, paymentSettingsSchema, toSettingsRow } from "@/lib/admin/payment-settings-schema";
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
