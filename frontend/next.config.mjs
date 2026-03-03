/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  turbopack: {
    root: '.',
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
