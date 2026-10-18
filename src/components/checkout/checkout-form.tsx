"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, Info, MessageCircle, ShoppingBag } from "lucide-react";
import { deliveryOptions, siteConfig } from "@/config/site";
import { deliveryCharge, isPaymentAllowed, paymentLabels, paymentMethods, type PaymentMethod } from "@/lib/checkout/rules";
import { checkoutSchema, type CheckoutData, type CheckoutInput } from "@/lib/checkout/schema";
import { buildWhatsAppOrderMessage } from "@/lib/checkout/whatsapp-order";
import { formatPKR, whatsappLink } from "@/lib/format";
import { Alert } from "@/components/feedback/alert";
import { EmptyState } from "@/components/feedback/empty-state";
import { FormField } from "@/components/forms/form-field";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceCard } from "./choice-card";

const cities = [
  "Rawalpindi", "Islamabad", "Lahore", "Karachi", "Peshawar", "Quetta", "Multan", "Faisalabad",
  "Gujranwala", "Sialkot", "Sargodha", "Bahawalpur", "Abbottabad", "Mardan", "Hyderabad", "Sukkur",
  "Muzaffarabad", "Mirpur", "Jhelum", "Attock", "Chakwal", "Gujrat", "Wah Cantt", "Taxila",
];

const paymentNotes: Record<PaymentMethod, string> = {
  jazzcash: "Pay after placing the order. We dispatch after verifying your payment.",
  easypaisa: "Pay after placing the order. We dispatch after verifying your payment.",
  cod: "Pay in cash when the courier delivers your books.",
};

export function CheckoutForm() {
  const { lines, ready, subtotal } = useCart();
  const [review, setReview] = useState<CheckoutData | null>(null);

  const form = useForm<CheckoutInput, unknown, CheckoutData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      notes: "",
      deliveryMethod: "courier",
      paymentMethod: "cod",
    },
  });
  const { register, handleSubmit, control, setValue, formState } = form;
  const errors = formState.errors;
  const delivery = useWatch({ control, name: "deliveryMethod" });
  const payment = useWatch({ control, name: "paymentMethod" });
  const shipping = delivery ? deliveryCharge(delivery) : 0;

  if (!ready) {
    return <Skeleton className="h-96 w-full rounded-2xl" />;
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={ShoppingBag}
        title="Your cart is empty"
        description="Add books to your cart before checking out."
        action={
          <Button asChild size="pill">
            <Link href="/books">Browse books</Link>
          </Button>
        }
      />
    );
  }

  const onSubmit = (data: CheckoutData) => {
    setReview(data);
    requestAnimationFrame(() => document.getElementById("order-review")?.focus());
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      // Any edit makes the reviewed message stale, so ask for a fresh review.
      onChange={() => review && setReview(null)}
      noValidate
      className="grid gap-8 lg:grid-cols-[1fr_380px]"
    >
      <div className="space-y-8">
        <fieldset className="space-y-4">
          <legend className="mb-2 text-lg font-semibold">1. Your details</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Full name" required error={errors.name?.message}>
              <Input autoComplete="name" {...register("name")} />
            </FormField>
            <FormField label="Mobile number" required hint="e.g. 0300-1234567" error={errors.phone?.message}>
              <Input type="tel" inputMode="tel" autoComplete="tel" {...register("phone")} />
            </FormField>
          </div>
          <FormField label="Email" hint="For order updates" error={errors.email?.message}>
            <Input type="email" autoComplete="email" {...register("email")} />
          </FormField>
          <FormField label="Delivery address" required hint="House, street, area" error={errors.address?.message}>
            <Textarea rows={3} autoComplete="street-address" {...register("address")} />
          </FormField>
          <FormField label="City" required error={errors.city?.message}>
            <Input list="checkout-cities" autoComplete="address-level2" {...register("city")} />
          </FormField>
          <datalist id="checkout-cities">
            {cities.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <FormField label="Delivery notes" hint="Landmark, best time to call…" error={errors.notes?.message}>
            <Textarea rows={2} {...register("notes")} />
          </FormField>
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-lg font-semibold">2. Delivery method</legend>
          <Controller
            control={control}
            name="deliveryMethod"
            render={({ field }) => (
              <div className="grid gap-3 sm:grid-cols-2">
                {deliveryOptions.map((o) => (
                  <ChoiceCard
                    key={o.id}
                    name={field.name}
                    value={o.id}
                    checked={field.value === o.id}
                    onChange={(v) => {
                      field.onChange(v);
                      // Switching to Pakistan Post makes COD invalid; move to a prepaid option.
                      if (!isPaymentAllowed(o.id, payment)) setValue("paymentMethod", "jazzcash");
                    }}
                    title={o.label}
                    description={o.note}
                    aside={formatPKR(o.charge)}
                  />
                ))}
              </div>
            )}
          />
        </fieldset>

        <fieldset>
          <legend className="mb-3 text-lg font-semibold">3. Payment method</legend>
          <Controller
            control={control}
            name="paymentMethod"
            render={({ field }) => (
              <div className="grid gap-3 sm:grid-cols-3">
                {paymentMethods.map((m) => {
                  const allowed = isPaymentAllowed(delivery, m);
                  return (
                    <ChoiceCard
                      key={m}
                      name={field.name}
                      value={m}
                      checked={field.value === m}
                      disabled={!allowed}
                      onChange={field.onChange}
                      title={paymentLabels[m]}
                      description={allowed ? undefined : "Only with TCS / Leopards"}
                    />
                  );
                })}
              </div>
            )}
          />
          {errors.paymentMethod?.message && (
            <p className="mt-2 text-xs font-medium text-destructive">{errors.paymentMethod.message}</p>
          )}
          {payment && <p className="mt-3 flex gap-2 text-sm text-muted-foreground"><Info className="mt-0.5 size-4 shrink-0" aria-hidden />{paymentNotes[payment]}</p>}
        </fieldset>
      </div>

      <aside aria-labelledby="checkout-summary" className="h-fit space-y-4 rounded-2xl bg-surface p-5 ring-1 ring-border lg:sticky lg:top-24">
        <h2 id="checkout-summary" className="text-lg font-semibold">
          Order summary
        </h2>
        <ul className="space-y-3">
          {lines.map((l) => (
            <li key={l.slug} className="flex gap-3 text-sm">
              <span className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {l.coverUrl ? (
                  <Image src={l.coverUrl} alt="" fill sizes="48px" className="object-contain p-0.5" />
                ) : (
                  <BookOpen className="m-auto mt-4 size-4 text-muted-foreground" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2">{l.title}</span>
                <span className="text-xs text-muted-foreground">Qty {l.quantity}</span>
              </span>
              <span className="font-medium">{formatPKR(l.price * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatPKR(subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{formatPKR(shipping)}</dd>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatPKR(subtotal + shipping)}</dd>
          </div>
        </dl>

        {review ? (
          <div id="order-review" tabIndex={-1} className="space-y-3 outline-none">
            <Alert tone="info" title="Online ordering opens soon">
              Your details are ready. Send this order to our shop on WhatsApp and we will confirm it with you.
              Nothing has been ordered yet.
            </Alert>
            <Button asChild size="pill" className="w-full bg-whatsapp hover:bg-whatsapp/90">
              <a
                href={whatsappLink(siteConfig.phoneE164, buildWhatsAppOrderMessage(lines, review))}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle aria-hidden /> Send order on WhatsApp
              </a>
            </Button>
          </div>
        ) : (
          <Button type="submit" size="pill" className="w-full" disabled={formState.isSubmitting}>
            Review order
          </Button>
        )}
        <p className="text-xs text-muted-foreground">
          We never ask for card numbers, PINs or OTPs.
        </p>
      </aside>
    </form>
  );
}
