import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Security: remove X-Powered-By header
  poweredByHeader: false,

  // Enable React strict mode for better development practices
  reactStrictMode: true,

  // Image optimization (Vercel handles this automatically)
  images: {
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
