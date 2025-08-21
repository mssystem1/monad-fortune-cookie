/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
console.log('>> next.config.cjs loaded'); // verify in Vercel logs
module.exports = nextConfig;
