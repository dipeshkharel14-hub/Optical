/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // Required for GitHub Pages
  basePath: '/radhakrishna_optical', // Replace with your exact repo name
  images: {
    unoptimized: true, // Needed for static hosting
  },
};

export default nextConfig;
