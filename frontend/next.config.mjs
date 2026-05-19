/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg', 'bcrypt', 'jsonwebtoken', 'nodemailer'],
  },
}

export default nextConfig
