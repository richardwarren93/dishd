import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dishd/shared", "@dishd/supabase"],
};

export default nextConfig;
