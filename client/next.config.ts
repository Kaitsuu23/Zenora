import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    scrollRestoration: false,
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pics.javhd.today",
      },
      {
        protocol: "https",
        hostname: "cdn10.javtop.fun",
      },
      {
        protocol: "https",
        hostname: "*.javhd.today",
      },
      {
        protocol: "https",
        hostname: "*.javtop.fun",
      },
      {
        protocol: "http",
        hostname: "pics.javhd.today",
      },
    ],
  },
};

export default nextConfig;
