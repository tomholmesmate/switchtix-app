import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Stub photos are shrunk in the browser before upload, so 4 MB is plenty.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
