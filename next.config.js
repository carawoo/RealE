/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/chat.html', destination: '/chat', permanent: false },
      { source: '/chat.html/:path*', destination: '/chat', permanent: false },
    ];
  },
};
module.exports = nextConfig;