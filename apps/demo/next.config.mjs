/** @type {import('next').NextConfig} */

// GitHub Pages serves the site from /<repo-name>/, so we need a basePath.
// Override via NEXT_PUBLIC_BASE_PATH if the repo is renamed or deployed
// to a custom domain (CNAME → empty string).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/GRX-Platform";

const nextConfig = {
  output: "export",
  basePath,
  // The asset prefix needs to match basePath so static assets resolve.
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
