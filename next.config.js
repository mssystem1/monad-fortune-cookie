/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};

console.log('>> next.config.js loaded'); // sanity log
module.exports = nextConfig;
