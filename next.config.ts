import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Prevent pdf-parse from being bundled by Next.js; let Node.js handle it natively.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
