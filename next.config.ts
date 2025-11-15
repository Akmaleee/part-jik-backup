import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals || []), 'officegen'];
    } else {
      config.resolve.fallback = {
        fs: false,
        path: false,
        stream: false,
      };
    }
    return config;
  },

  eslint: {
    // Peringatan: Ini akan mengabaikan error ESLint saat build.
    // Pastikan Anda memeriksa error secara manual di editor Anda.
    ignoreDuringBuilds: true,
  },

};

export default nextConfig;
