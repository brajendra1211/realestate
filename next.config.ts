import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // User-uploaded images are already resized/compressed to webp at upload
    // time (see src/lib/upload.ts). Next's own optimizer additionally fails
    // to see files added to /public after the last build, so it's disabled
    // rather than relied on for these locally-hosted assets.
    unoptimized: true,
  },
};

export default nextConfig;
