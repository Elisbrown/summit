import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
    serverComponentsExternalPackages: ["better-sqlite3"],
  },
};

export default nextConfig;

