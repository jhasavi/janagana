/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ['@orgflow/ui', '@orgflow/types', '@orgflow/utils'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  experimental: {
    typedRoutes: true,
  },
  async rewrites() {
    return [
      {
        source: '/tenant/:path*',
        destination: '/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'x-orgflow-tenant-hint',
            value: 'Use subdomain for tenant routing',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
