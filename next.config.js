/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    config.resolve.alias.canvas = false;
    config.resolve.alias.encoding = false;

    // Remove any existing rules for .worker.js files
    config.module.rules = config.module.rules.filter(
      rule => !(rule.test instanceof RegExp && rule.test.test('.worker.js'))
    );

    // Add our new rule for PDF.js worker
    config.module.rules.push({
      test: /pdf\.worker\.js$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/worker/[hash][ext][query]'
      }
    });

    // Audio worklet support
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        audio: false,
      }
    }

    return config;
  },
  // Add this to handle worker files properly
  experimental: {
    serverActions: true,
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization, X-User-Id' },
        ],
      },
    ]
  }
}

module.exports = nextConfig 