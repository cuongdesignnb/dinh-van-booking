import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Lets a dev server run next to a production build without sharing `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
};

export default nextConfig;
