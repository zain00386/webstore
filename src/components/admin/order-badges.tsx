import { Badge } from "@/components/ui/badge";
import { orderStatusLabels, paymentStatusLabels } from "@/lib/orders/admin-actions";
import type { OrderStatus, PaymentMethodDb, PaymentStatus } from "@/lib/supabase/database.types";

const statusVariant: Record<OrderStatus, "brand" | "secondary" | "success" | "outline" | "destructive"> = {
  pending: "brand",
  confirmed: "secondary",
  processing: "secondary",
  shipped: "secondary",
  delivered: "success",
  cancelled: "destructive",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge variant={statusVariant[status]}>{orderStatusLabels[status]}</Badge>;
}

export function PaymentStatusBadge({ status, method }: { status: PaymentStatus; method: PaymentMethodDb }) {
  const verify = status === "pending" && method !== "cod";
  const label = verify ? "To verify" : status === "pending" && method === "cod" ? "Cash on delivery" : paymentStatusLabels[status];
  const variant = status === "paid" ? "success" : verify || status === "failed" ? "warning" : "outline";
  return <Badge variant={variant}>{label}</Badge>;
}
