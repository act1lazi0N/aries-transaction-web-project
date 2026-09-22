import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typedRoutes: true,
  headers: async () => [
    { source: "/forgot-password", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    { source: "/reset-password", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
  ],
};

export default nextConfig;
