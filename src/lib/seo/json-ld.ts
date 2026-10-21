import { siteConfig } from "@/config/site";
import { siteUrl } from "@/lib/site-url";
import { internationalPhone, type StoreInfo } from "@/lib/store-info";
import type { Post } from "@/types/post";

/**
 * schema.org data for Google, built only from true facts: the shop's real
 * address, phone and hours, and posts' real titles and dates. No ratings,
 * reviews or price ranges are invented.
 */
export function storeJsonLd(store: StoreInfo) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BookStore",
    name: siteConfig.fullName,
    url: base,
    logo: `${base}/brand/logo.png`,
    image: `${base}/brand/logo.png`,
    telephone: internationalPhone(store.phones[0] ?? store.phoneDisplay),
    address: {
      "@type": "PostalAddress",
      streetAddress: store.address.replace(/,?\s*Rawalpindi$/i, ""),
      addressLocality: "Rawalpindi",
      addressRegion: "Punjab",
      addressCountry: "PK",
    },
    // Shop open 10:00-21:00, closed Friday (online orders every day).
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        opens: "10:00",
        closes: "21:00",
      },
    ],
    currenciesAccepted: "PKR",
  };
}

export function articleJsonLd(post: Post) {
  const base = siteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title.slice(0, 110),
    ...(post.excerpt ? { description: post.excerpt } : {}),
    ...(post.coverUrl ? { image: [post.coverUrl] } : {}),
    datePublished: post.publishedAt,
    url: `${base}/blog/${post.slug}`,
    mainEntityOfPage: `${base}/blog/${post.slug}`,
    author: { "@type": "Organization", name: siteConfig.fullName, url: base },
    publisher: { "@type": "Organization", name: siteConfig.fullName, logo: { "@type": "ImageObject", url: `${base}/brand/logo.png` } },
  };
}

/** Safe <script type="application/ld+json"> contents: "<" escaped so text can never close the tag. */
export function jsonLdHtml(data: unknown): { __html: string } {
  return { __html: JSON.stringify(data).replace(/</g, "\u003c") };
}
