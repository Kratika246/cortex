import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['groq-sdk'],
  allowedDevOrigins: ['10.11.22.71'],
}

export default nextConfig