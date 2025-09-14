/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...config.externals, 'canvas', 'jsdom'];
    }
    return config;
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@opentelemetry/instrumentation',
      'require-in-the-middle',
    ],
  },
};

export default nextConfig;
