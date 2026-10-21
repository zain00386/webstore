import { siteUrl } from "@/lib/site-url";
import type { Book } from "@/types/book";

/**
 * schema.org Book/Product data for Google, built only from real fields.
 * No ratings or reviews are included because the shop doesn't have any yet.
 */
export function productJsonLd(book: Book, categoryName?: string) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": ["Product", "Book"],
    name: book.title,
    url: `${base}/books/${book.slug}`,
    ...(book.images.length ? { image: book.images } : {}),
    ...(book.description.length ? { description: book.description.join(" ").replace(/•\s*/g, "").slice(0, 500) } : {}),
    ...(book.isbn ? { isbn: book.isbn, gtin13: book.isbn.length === 13 ? book.isbn : undefined } : {}),
    ...(book.author ? { author: { "@type": "Person", name: book.author } } : {}),
    ...(book.publisher
      ? { publisher: { "@type": "Organization", name: book.publisher }, brand: { "@type": "Brand", name: book.publisher } }
      : {}),
    ...(book.edition ? { bookEdition: book.edition } : {}),
    ...(categoryName ? { category: categoryName } : {}),
    offers: {
      "@type": "Offer",
      url: `${base}/books/${book.slug}`,
      priceCurrency: "PKR",
      price: book.price.toFixed(2),
      availability: book.stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Dogar's Unique Books Rawalpindi" },
    },
  };
}
