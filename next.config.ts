import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // pdf-parse uses dynamic requires that bundlers can't follow.
  serverExternalPackages: ['pdf-parse'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'github.com' },
      // Profile photos of Google sign-ins.
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Official GSoC organization logos.
      { protocol: 'https', hostname: 'summerofcode.withgoogle.com' },
    ],
  },
  async redirects() {
    return [{ source: '/programs', destination: '/events', permanent: false }];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
