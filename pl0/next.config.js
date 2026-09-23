/** @type {import('next').NextConfig} */
const rawBasePath = process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : '/~lipka/fjp/pl0';
const basePath = rawBasePath.trim();

const nextConfig = {
    reactStrictMode: true,
    output: 'export',
    basePath: basePath || undefined,
    assetPrefix: basePath ? (basePath + '/') : undefined,
    images: {
        unoptimized: true,
    },
};

module.exports = nextConfig;
