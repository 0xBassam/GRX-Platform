/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Puppeteer + docx + @sparticuz/chromium ship heavy native bits we don't
    // want Next to try to bundle into the edge runtime. These packages are
    // only used server-side in Node functions.
    serverComponentsExternalPackages: [
      "puppeteer-core",
      "@sparticuz/chromium",
      "docx",
    ],
  },
  env: {
    GRX_DEMO_MODE: process.env.GRX_DEMO_MODE ?? "0",
  },
};

export default nextConfig;
