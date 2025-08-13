/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 또는 제거
  trailingSlash: false,
  experimental: {
    appDir: true
  }
}

module.exports = nextConfig
