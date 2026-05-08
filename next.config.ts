import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Packages that pull in dynamic requires / native deps must be kept out of
  // the route-handler bundle and resolved at runtime by Node.
  serverExternalPackages: [
    "@e2b/code-interpreter",
    "@modelcontextprotocol/sdk",
  ],
};

export default nextConfig;
