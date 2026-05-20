/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg', 'bcrypt', 'jsonwebtoken', 'nodemailer', 'xlsx'],
  },
}

export default nextConfig
