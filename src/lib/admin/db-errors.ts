/** Turns Postgres/PostgREST errors into messages the shop owner can act on. */
export type DbError = { code?: string; message: string; details?: string | null };

export function friendlyBookError(error: DbError): { field?: string; message: string } {
  const text = `${error.message} ${error.details ?? ""}`;
  if (error.code === "23505" && text.includes("slug")) {
    return { field: "slug", message: "This web address is already used by another book. Change it slightly." };
  }
  if (error.code === "23505" && text.includes("source_ref")) {
    return { message: "This book was already imported." };
  }
  if (error.code === "23514") {
    if (text.includes("compare_at_price")) {
      return { field: "compareAtPrice", message: "The 'was' price must be higher than the price (or left empty)." };
    }
    if (text.includes("stock_quantity")) return { field: "stockQuantity", message: "Stock can't be negative." };
    if (text.includes("price")) return { field: "price", message: "Price can't be negative." };
    if (text.includes("isbn")) return { field: "isbn", message: "Enter a valid ISBN." };
    return { message: "One of the values isn't allowed. Check the highlighted fields and try again." };
  }
  if (error.code === "42501" || /row-level security|permission denied/i.test(text)) {
    return { message: "You don't have permission to do this. Sign in again as an admin." };
  }
  return { message: "Could not save. Please try again." };
}
