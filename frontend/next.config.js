/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: 'http://76.13.179.250:3001/api/:path*'
            },
            {
                source: '/uploads/:path*',
                destination: 'http://76.13.179.250:3001/uploads/:path*'
            }
        ];
    },
    // Disable caching in development for faster updates
    ...(process.env.NODE_ENV === 'development' && {
        onDemandEntries: {
            maxInactiveAge: 25 * 1000,
            pagesBufferLength: 2,
        },
    }),
};

module.exports = nextConfig;
