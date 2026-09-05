import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["mammoth", "pdf-parse"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
