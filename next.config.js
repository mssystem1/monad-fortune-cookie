/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignore TypeScript & ESLint errors **only during builds** (keeps dev DX)
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },
};
module.exports = nextConfig;
