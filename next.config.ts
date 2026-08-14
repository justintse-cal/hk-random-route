import type { NextConfig } from "next";

const GRAPH_ROUTES = {
  "/api/generate": ["./public/graph.bin"],
  "/api/snap": ["./public/graph.bin"],
};

const nextConfig: NextConfig = {
  outputFileTracingIncludes: GRAPH_ROUTES,
};

export default nextConfig;
