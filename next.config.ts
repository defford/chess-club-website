import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    outputFileTracingRoot: __dirname,
  },
};

export default nextConfig;
