import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "localhost:3020",
        "localhost:3021",
        "127.0.0.1:3020",
        "127.0.0.1:3021",
      ],
    },
  },
};

export default nextConfig;
