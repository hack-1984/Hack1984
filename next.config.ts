import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The dev-only Next badge sits in the canvas corner and covers the map's overlays.
  // Build errors still open the overlay; this hides the badge only.
  devIndicators: false,
  cacheComponents: true,
  partialPrefetching: true,
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
