// site-cliente/next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/dgrah9zsp/image/upload/**', // Garanta que seu cloud name está correto aqui
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      }
    ],
  },
  // Mantenha outras configurações como 'experimental.turbopack' se as tiver
};

export default nextConfig;