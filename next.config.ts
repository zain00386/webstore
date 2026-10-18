import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    // Lahore main-branch covers, used until images are copied to our own storage (Phase 3).
    remotePatterns: [new URL("https://dogarpublishers.com.pk/wp-content/uploads/**")],
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
