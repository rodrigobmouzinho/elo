import createWithVercelToolbar from "@vercel/toolbar/plugins/next";
import type { NextConfig } from "next";

function resolveApiBaseUrl() {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3002";
  const withoutTrailingSlash = raw.replace(/\/+$/, "");
  return withoutTrailingSlash.endsWith("/api") ? withoutTrailingSlash.slice(0, -4) : withoutTrailingSlash;
}

const apiBaseUrl = resolveApiBaseUrl();

const nextConfig: NextConfig = {
  transpilePackages: ["@elo/core", "@elo/ui"],
  async rewrites() {
    return [
      {
        source: "/backend/:path*",
        destination: `${apiBaseUrl}/api/:path*`
      }
    ];
  }
};

const withVercelToolbar = createWithVercelToolbar();

export default withVercelToolbar(nextConfig);
