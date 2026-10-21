"use client";

import { useState } from "react";
import { WhatsAppIcon } from "@/components/icons/whatsapp-icon";
import type { CartItemInput } from "@/lib/cart/cart";
import { MAX_PER_LINE } from "@/lib/cart/cart";
import { whatsappLink } from "@/lib/format";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { useCart } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { QuantityStepper } from "./quantity-stepper";

type PurchasePanelProps = {
  item: CartItemInput;
  phoneE164: string;
};

export function PurchasePanel({ item, phoneE164 }: PurchasePanelProps) {
  const { lines } = useCart();
  const inCart = lines.find((l) => l.slug === item.slug)?.quantity ?? 0;
  const available = Math.max(0, Math.min(item.maxQuantity, MAX_PER_LINE) - inCart);
  const [quantity, setQuantity] = useState(1);
  const qty = Math.min(quantity, Math.max(1, available));
  const soldOut = item.maxQuantity <= 0;

  return (
    <div className="space-y-3">
      {!soldOut && (
        <div className="flex flex-wrap items-center gap-3">
          <QuantityStepper
            label={`Quantity of ${item.title}`}
            value={qty}
            onChange={setQuantity}
            max={Math.max(1, available)}
            disabled={available === 0}
          />
          {inCart > 0 && <span className="text-sm text-muted-foreground">{inCart} already in your cart</span>}
        </div>
      )}
      <AddToCartButton item={item} quantity={qty} size="pill" />
      <Button asChild variant="outline" size="pill" className="w-full">
        <a
          href={whatsappLink(phoneE164, `Assalam-o-Alaikum, I want to order: ${item.title} (quantity ${qty}).`)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <WhatsAppIcon /> Order on WhatsApp
        </a>
      </Button>
    </div>
  );
}
