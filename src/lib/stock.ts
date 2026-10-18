export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

/**
 * Turns a stock count into what customers see.
 * "Low stock" only appears when a threshold is configured (no fake scarcity).
 */
export function getStockStatus(quantity: number, lowStockThreshold?: number | null): StockStatus {
  if (quantity <= 0) return "out_of_stock";
  if (lowStockThreshold != null && lowStockThreshold > 0 && quantity <= lowStockThreshold) {
    return "low_stock";
  }
  return "in_stock";
}
