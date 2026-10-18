import type { BookSummary } from "@/types/book";

/**
 * PREVIEW DATA ONLY (Phase 1). Real Dogar titles and prices from the Lahore
 * catalogue, but the stock numbers are made up to show each badge state.
 * Replaced by database data in Phase 4.
 */
export const sampleBooks: BookSummary[] = [
  {
    slug: "punjab-public-service-commission-combined-competitive-examination-pms-guide-subjective-objective-by-dogar-publishers",
    title: "PPSC Combined Competitive Examination PMS Guide (Subjective + Objective)",
    author: null,
    publisher: "Dogar Publishers",
    price: 1800,
    compareAtPrice: 2500,
    stockQuantity: 12,
    coverUrl: "https://dogarpublishers.com.pk/wp-content/uploads/2026/01/PMS-Guide.png",
  },
  {
    slug: "ecat-toppers-bundle-set-of-2-books-ecat-guide-ecat-papers-2026-edition",
    title: "ECAT Toppers Bundle Set of 2 Books (ECAT Guide + ECAT Papers) 2026 Edition",
    author: null,
    publisher: "Dogar Publishers",
    price: 3000,
    compareAtPrice: 4000,
    stockQuantity: 2,
    coverUrl: "https://dogarpublishers.com.pk/wp-content/uploads/2026/04/ECAT-Toppers-Bundle-1.png",
  },
  {
    slug: "dogars-unique-nurses-recruitment-test-guide-public-service-commission-specialized-healthcare-medical-education-department",
    title: "Dogar's Unique Nurses Recruitment Test Guide",
    author: null,
    publisher: "Dogar Publishers",
    price: 1500,
    compareAtPrice: 1800,
    stockQuantity: 8,
    coverUrl: "https://dogarpublishers.com.pk/wp-content/uploads/2026/09/Nurses-Guide.jpg",
  },
  {
    slug: "issb-tests",
    title: "ISSB Tests Preparation Guide",
    author: null,
    publisher: "Dogar Publishers",
    price: 800,
    compareAtPrice: null,
    stockQuantity: 0,
    coverUrl: "https://dogarpublishers.com.pk/wp-content/uploads/2023/02/ISSB-Tests.jpg.png",
  },
];

/** Low-stock threshold used for the preview cards only. */
export const SAMPLE_LOW_STOCK_THRESHOLD = 3;
