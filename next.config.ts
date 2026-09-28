import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    // Membenarkan Vercel melepasi semakan ralat TypeScript semasa build
    ignoreBuildErrors: true,
  },
  eslint: {
    // Membenarkan Vercel melepasi semakan ESLint semasa build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;