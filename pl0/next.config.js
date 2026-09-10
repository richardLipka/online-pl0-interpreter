/** @type {import('next').NextConfig} */
const basePath = process.env.BASE_PATH || '';

const nextConfig = {
    reactStrictMode: true,
    output: 'export',
    basePath: basePath || undefined,
    assetPrefix: basePath ? `${basePath}/` : undefined,
    images: {
        unoptimized: true,
    },
};

module.exports = nextConfig;
