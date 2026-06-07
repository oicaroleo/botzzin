import type { NextConfig } from "next";

// API backend URL - can be different from public API URL
const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://localhost:3001';

const nextConfig: NextConfig = {
  // Server-side proxy for API requests
  // This allows calling /api/* which gets proxied to the backend
  rewrites: async () => {
    return {
      beforeFiles: [
        {
          source: '/api/:path*',
          destination: `${API_BACKEND_URL}/api/:path*`,
        },
        {
          source: '/webhook/:path*',
          destination: `${API_BACKEND_URL}/webhook/:path*`,
        },
        {
          source: '/health',
          destination: `${API_BACKEND_URL}/health`,
        },
      ],
    };
  },
};

export default nextConfig;
