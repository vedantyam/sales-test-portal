/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg', 'bcrypt', 'jsonwebtoken', 'nodemailer', 'xlsx', 'satori', '@resvg/resvg-js'],
  },
}

export default nextConfig
