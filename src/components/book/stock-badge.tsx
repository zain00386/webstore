import { Badge } from "@/components/ui/badge";
import type { StockStatus } from "@/lib/stock";

const config = {
  in_stock: { label: "In stock", variant: "success" },
  low_stock: { label: "Low stock", variant: "warning" },
  out_of_stock: { label: "Out of stock", variant: "brand" },
} as const;

export function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  const { label, variant } = config[status];
  return (
    <Badge variant={variant} className={className}>
      {label}
    </Badge>
  );
}
