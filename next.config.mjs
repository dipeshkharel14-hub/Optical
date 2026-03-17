/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  basePath: '/radhakrishna_Optical',     // exact repo name, case-sensitive
  assetPrefix: '/radhakrishna_Optical/', // trailing slash is important
  images: {
    unoptimized: true,
  },
  trailingSlash: true,                   // prevents many refresh 404s
};

export default nextConfig;
