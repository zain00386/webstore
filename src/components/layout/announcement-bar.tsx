import { Truck } from "lucide-react";

export function AnnouncementBar() {
  return (
    <div className="bg-primary px-4 py-2 text-center text-xs font-medium text-primary-foreground">
      <p className="flex items-center justify-center gap-2">
        <Truck className="size-3.5 shrink-0" aria-hidden />
        <span>
          Delivery all over Pakistan from Rs. 300
          <span className="hidden sm:inline"> | JazzCash, Easypaisa or Cash on Delivery</span>
          <span className="sm:hidden"> | COD available</span>
        </span>
      </p>
    </div>
  );
}
