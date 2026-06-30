import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — there are stray lockfiles in parent directories
  // that Next would otherwise infer as the root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
