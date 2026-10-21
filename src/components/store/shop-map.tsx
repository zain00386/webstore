import { mapsEmbedFor } from "@/lib/store-info";

/**
 * Google map of the shop (Dogar's Unique Books, Iqbal Road, Committee Chowk).
 * Loads only when scrolled near, and sends no referrer to Google.
 */
export function ShopMap({ address, className = "" }: { address: string; className?: string }) {
  return (
    <iframe
      title="Map: Dogar's Unique Books, Iqbal Road, Committee Chowk, Rawalpindi"
      src={mapsEmbedFor(address)}
      loading="lazy"
      referrerPolicy="no-referrer"
      allowFullScreen
      className={`h-72 w-full rounded-2xl border-0 ring-1 ring-border ${className}`}
    />
  );
}
