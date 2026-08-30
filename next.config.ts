import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/proxy/openai/:path*',
        destination: 'https://api.openai.com/:path*',
      },
      {
        source: '/api/proxy/groq/:path*',
        destination: 'https://api.groq.com/:path*',
      },
    ];
  },
};

export default nextConfig;
