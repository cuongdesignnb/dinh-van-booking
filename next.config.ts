import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Lets a dev server run next to a production build without sharing `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // Tags every asset URL with the deployment that produced it. During the few
  // seconds an alias swaps between deployments, a page served by the previous
  // build then keeps loading its own chunks instead of 404ing against the new
  // one (which is what made React fall back to client rendering right after a
  // deploy). Requires Skew Protection to be enabled for the Vercel project.
  deploymentId: process.env.VERCEL_DEPLOYMENT_ID,
};

export default nextConfig;
