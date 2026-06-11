import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.68.57", "10.10.0.3"],
  transpilePackages: ["@nied/schema"],
};

export default nextConfig;
