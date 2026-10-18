import { discountPercent, formatPKR } from "@/lib/format";
import { cn } from "@/lib/utils";

type PriceProps = {
  price: number;
  compareAt?: number | null;
  size?: "default" | "lg";
  className?: string;
};

export function Price({ price, compareAt, size = "default", className }: PriceProps) {
  const discount = discountPercent(price, compareAt);
  return (
    <p className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      <span
        className={cn(
          "font-semibold",
          size === "lg" ? "text-2xl" : "text-base",
          discount && "text-brand",
        )}
      >
        {formatPKR(price)}
      </span>
      {discount && compareAt && (
        <>
          <span className="text-sm text-muted-foreground line-through">
            <span className="sr-only">Was </span>
            {formatPKR(compareAt)}
          </span>
          <span className="rounded-full bg-brand-soft px-1.5 py-0.5 text-[0.7rem] font-semibold text-brand">
            -{discount}%
          </span>
        </>
      )}
    </p>
  );
}
