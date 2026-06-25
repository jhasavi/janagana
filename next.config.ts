import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "6mb",
      allowedOrigins: [
        "localhost:3000",
        "localhost:3020",
        "localhost:3021",
        "127.0.0.1:3020",
        "127.0.0.1:3021",
        "janagana.namasteneedham.com",
        "www.janagana.namasteneedham.com",
      ],
    },
  },
};

export default nextConfig;
