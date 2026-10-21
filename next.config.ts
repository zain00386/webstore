import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");

/**
 * Browser safety headers for every page. (A full script Content-Security-Policy
 * would need per-request nonces; these rules are safe with Next.js as it is.)
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // The shop must never be shown inside another site's frame (clickjacking).
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  // Browsers only act on this over HTTPS (the live site); harmless on localhost.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Book covers can be up to 2 MB; leave room for the rest of the form.
    serverActions: { bodySizeLimit: "3mb" },
    // The development disk cache served out-of-date code several times (CSS and
    // server modules), even after restarts. Off for `next dev` only; builds keep it.
    turbopackFileSystemCacheForDev: false,
  },
  images: {
    remotePatterns: [
      // Lahore main-branch covers (preview data, and fallback for images that couldn't be copied).
      new URL("https://dogarpublishers.com.pk/wp-content/uploads/**"),
      // Our own Supabase storage (public buckets only).
      ...(supabaseUrl?.startsWith("https://") ? [new URL(`${supabaseUrl}/storage/v1/object/public/**`)] : []),
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
