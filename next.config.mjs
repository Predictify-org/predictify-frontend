let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

const isProduction = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Only ignore build errors in development for faster iteration
  // In production, we want to catch all errors
  eslint: {
    ignoreDuringBuilds: !isProduction,
  },
  typescript: {
    // Only ignore TypeScript errors in development
    // In production, all type errors should be fixed
    ignoreBuildErrors: !isProduction,
  },
  images: {
    // Enable image optimization in production
    unoptimized: false,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  // Production optimizations
  ...(isProduction && {
    compress: true,
    poweredByHeader: false,
  }),
}

mergeConfig(nextConfig, userConfig)

function mergeConfig(nextConfig, userConfig) {
  if (!userConfig) {
    return
  }

  for (const key in userConfig) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...userConfig[key],
      }
    } else {
      nextConfig[key] = userConfig[key]
    }
  }
}

export default nextConfig
