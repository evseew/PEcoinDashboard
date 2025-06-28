/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    domains: [
      'arweave.net',
      'gateway.pinata.cloud',
      'ipfs.io',
      'cf-ipfs.com',
      'cloudflare-ipfs.com',
      'nftstorage.link',
      'dweb.link'
    ],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      }
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Подавляем предупреждения Supabase о динамических импортах
      config.ignoreWarnings = [
        ...(config.ignoreWarnings || []),
        {
          module: /node_modules\/@supabase\/realtime-js/,
          message: /Critical dependency: the request of a dependency is an expression/,
        }
      ]
    } else {
      // ✅ ИСПРАВЛЕНИЕ ChunkLoadError: Оптимизации для клиентского бандла
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      }
      
      // ✅ ИСПРАВЛЕНО: Проверяем что splitChunks существует
      if (config.optimization && config.optimization.splitChunks && typeof config.optimization.splitChunks === 'object') {
        config.optimization.splitChunks.cacheGroups = {
          ...config.optimization.splitChunks.cacheGroups,
          solana: {
            test: /[\\/]node_modules[\\/]@solana[\\/]/,
            name: 'solana',
            chunks: 'all',
            priority: 20,
          },
        }
      }
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
    ]
  }
}

export default nextConfig
