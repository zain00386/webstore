"use client";

import { useActionState, useEffect } from "react";
import { LoaderCircle, MapPin, Save, Truck } from "lucide-react";
import { toast } from "sonner";
import type { StoreSettingsInput } from "@/lib/admin/store-settings-schema";
import { FormField } from "@/components/forms/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveStoreSettings, type StoreSettingsState } from "./actions";

const check = "size-5 accent-[var(--primary)]";

export function StoreSettingsForm({ initial }: { initial: StoreSettingsInput }) {
  const [state, action, pending] = useActionState<StoreSettingsState, FormData>(saveStoreSettings, {});
  useEffect(() => {
    if (state.ok) toast.success(state.ok);
    else if (state.error) toast.error(state.error);
  }, [state]);

  const v = state.values ?? initial;
  const updatedAt = state.updatedAt ?? initial.updatedAt;
  const err = state.fieldErrors ?? {};

  return (
    <form key={state.attempt ?? "initial"} action={action} className="space-y-5" noValidate>
      <input type="hidden" name="updatedAt" value={updatedAt} />
      {state.error && !state.fieldErrors && (
        <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {state.error}
        </p>
      )}

      <fieldset className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
        <legend className="sr-only">Store contact</legend>
        <h2 className="flex items-center gap-2 font-semibold">
          <MapPin className="size-4" aria-hidden /> Store contact
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Phone (shown on the site)" required error={err.phone}>
            <Input name="phone" defaultValue={v.phone} inputMode="tel" maxLength={20} />
          </FormField>
          <FormField label="WhatsApp number" required hint="All WhatsApp buttons open a chat with this number." error={err.whatsapp}>
            <Input name="whatsapp" defaultValue={v.whatsapp} inputMode="tel" maxLength={16} />
          </FormField>
        </div>
        <FormField label="Shop address" required hint="Also used for the “Get directions” map link." error={err.address}>
          <Input name="address" defaultValue={v.address} maxLength={300} />
        </FormField>
      </fieldset>

      <fieldset className="space-y-4 rounded-2xl bg-card p-5 ring-1 ring-border">
        <legend className="sr-only">Delivery</legend>
        <h2 className="flex items-center gap-2 font-semibold">
          <Truck className="size-4" aria-hidden /> Delivery & Cash on Delivery
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 rounded-xl bg-surface p-4 ring-1 ring-border">
            <label className="flex min-h-10 items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="pakistanPostEnabled" defaultChecked={v.pakistanPostEnabled} className={check} />
              Pakistan Post
            </label>
            {err.pakistanPostEnabled && <p className="text-xs font-medium text-destructive">{err.pakistanPostEnabled}</p>}
            <FormField label="Fee (Rs.)" required hint="Pay in advance only." error={err.pakistanPostFee}>
              <Input name="pakistanPostFee" defaultValue={v.pakistanPostFee} inputMode="numeric" maxLength={5} />
            </FormField>
          </div>
          <div className="space-y-2 rounded-xl bg-surface p-4 ring-1 ring-border">
            <label className="flex min-h-10 items-center gap-2 text-sm font-medium">
              <input type="checkbox" name="courierEnabled" defaultChecked={v.courierEnabled} className={check} />
              TCS / Leopards / M&amp;P
            </label>
            {err.courierEnabled && <p className="text-xs font-medium text-destructive">{err.courierEnabled}</p>}
            <FormField label="Fee (Rs.)" required error={err.courierFee}>
              <Input name="courierFee" defaultValue={v.courierFee} inputMode="numeric" maxLength={5} />
            </FormField>
          </div>
        </div>
        <label className="flex min-h-10 items-start gap-2 text-sm">
          <input type="checkbox" name="codEnabled" defaultChecked={v.codEnabled} className={`${check} mt-0.5`} />
          <span>
            <span className="font-medium">Offer Cash on Delivery</span>
            <span className="block text-xs text-muted-foreground">Only with the courier. Pakistan Post is always pay in advance.</span>
          </span>
        </label>
        {err.codEnabled && <p className="text-xs font-medium text-destructive">{err.codEnabled}</p>}
        <FormField
          label="Delivery note"
          hint="Shown on the Shipping page, e.g. “Remote areas can take a few extra days.” Don't promise exact delivery dates."
          error={err.deliveryNotes}
        >
          <Textarea name="deliveryNotes" defaultValue={v.deliveryNotes} rows={2} maxLength={500} />
        </FormField>
        <FormField
          label="Low-stock alert at"
          hint="Books show “Low stock” at this many copies or fewer. Empty or 0 = off. A book's own setting overrides this."
          error={err.lowStockThreshold}
        >
          <Input name="lowStockThreshold" defaultValue={v.lowStockThreshold} inputMode="numeric" maxLength={4} className="max-w-32" />
        </FormField>
        <p className="text-xs text-muted-foreground">
          Prices are shown in Pakistani Rupees (Rs.). A new fee applies to orders placed after you save; existing orders keep
          the fee they were placed with.
        </p>
      </fieldset>

      <Button type="submit" size="pill" disabled={pending}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden /> : <Save aria-hidden />} Save store & delivery
      </Button>
    </form>
  );
}
