"use client";

import { useRouter } from "next/navigation";
import { ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { CartItemInput } from "@/lib/cart/cart";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCart } from "./cart-provider";

type AddToCartButtonProps = {
  item: CartItemInput;
  quantity?: number;
  className?: string;
  size?: "default" | "pill";
};

export function AddToCartButton({ item, quantity = 1, className, size = "default" }: AddToCartButtonProps) {
  const { add, lines } = useCart();
  const router = useRouter();

  if (item.maxQuantity <= 0) {
    return (
      <Button variant="secondary" size={size} className={cn("w-full", className)} disabled>
        Out of stock
      </Button>
    );
  }

  const inCart = lines.find((l) => l.slug === item.slug)?.quantity ?? 0;
  const atLimit = inCart >= item.maxQuantity;

  return (
    <Button
      size={size}
      className={cn("w-full", className)}
      disabled={atLimit}
      onClick={() => {
        add(item, quantity);
        toast.success("Added to cart", {
          description: item.title,
          action: { label: "View cart", onClick: () => router.push("/cart") },
        });
      }}
    >
      <ShoppingBag aria-hidden />
      {atLimit ? "Max in cart" : "Add to cart"}
    </Button>
  );
}
