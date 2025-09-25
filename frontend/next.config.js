/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  
  images: {
    domains: [
      'localhost',
      'via.placeholder.com',
      'images.unsplash.com',
    ],
  },
  
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  },
  
  output: 'standalone',
}

module.exports = nextConfig