/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['pg', 'bcrypt', 'nodemailer'],
  },
}

export default nextConfig
