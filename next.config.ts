import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Book covers can be up to 2 MB; leave room for the rest of the form.
    serverActions: { bodySizeLimit: "3mb" },
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
