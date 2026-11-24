import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,  turbopack: {
    // Next.js auto-detects the workspace root by walking up for a lockfile,
    // and picks up C:\Users\<user>\package-lock.json first — pulling in
    // sibling projects under the home directory and causing chunk/manifest
    // collisions between concurrently running dev servers. Pin it here.
    root: __dirname,
  },
  // The live server kills `next build` (SIGKILL) when it uses too much memory, so keep the
  // production build lean: webpack memory optimizations on, and no source maps generated.
  productionBrowserSourceMaps: false,
  experimental: {
    webpackMemoryOptimizations: true,
    serverSourceMaps: false,
  },
  images: {
    // User-uploaded images are already resized/compressed to webp at upload
    // time (see src/lib/upload.ts). Next's own optimizer additionally fails
    // to see files added to /public after the last build, so it's disabled
    // rather than relied on for these locally-hosted assets.
    unoptimized: true,
  },
};

export default nextConfig;
